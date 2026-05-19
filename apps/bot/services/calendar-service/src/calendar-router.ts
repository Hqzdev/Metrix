import { audit, extractUserId, readJsonBody, signOAuthState, verifyOAuthState, verifyServiceRequest } from '@metrix/auth'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type Redis from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { CalendarServiceConfig } from './config.js'
import { AuthenticationError, CalendarServiceError, NotFoundError, OAuthStateError, ProviderNotConfiguredError, ReplayAttackError, ValidationError } from './errors.js'
import { sendJson } from './http-response.js'
import { decrypt, encrypt } from './crypto.js'
import type { CalendarServiceLogger } from './logger.js'
import type { GoogleOAuthClient } from './google-oauth-client.js'

type CalendarRouterDependencies = {
  config: CalendarServiceConfig
  googleOAuthClient: GoogleOAuthClient
  logger: CalendarServiceLogger
  prisma: PrismaClient
  redis: Redis
}

type RequestContext = {
  callerName: string
  callerUserId: number | undefined
  method: string
  parsedBody: unknown
  path: string
  requestId: string
  searchParams: URLSearchParams
}

type CalendarConnectionRow = {
  accessToken?: string | null
  expiresAt?: Date | null
  refreshToken: string
  telegramUserId: bigint
  [key: string]: unknown
}

type OAuthStateData = {
  telegramUserId: number
  scope: string
  resourceId?: string
}

/**
 * Обрабатывает HTTP-запросы calendar-service.
 *
 * Ответственность:
 * - проверяет service-to-service auth и replay-защиту;
 * - управляет OAuth-подключениями к Google Calendar;
 * - шифрует токены перед сохранением, расшифровывает при отдаче;
 * - при disconnect отзывает refresh token на стороне Google.
 */
export class CalendarRouter {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly deps: CalendarRouterDependencies) {}

  /**
   * Обрабатывает входящий HTTP-запрос и отправляет результат или ошибку.
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const context = await this.createRequestContext(req)
      const result = await this.dispatch(context)
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    const url = new URL(req.url ?? '/', `http://localhost:${this.deps.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', callerUserId: undefined, method, parsedBody: {}, path, requestId: 'health-check', searchParams: url.searchParams }
    }

    const { parsedBody, rawBody } = await readRequestBody(req, method)
    const auth = verifyServiceRequest(req, rawBody, this.deps.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    const fresh = await this.deps.redis.set(`replay:${auth.requestId}`, '1', 'EX', 60, 'NX')
    if (fresh !== 'OK') {
      throw new ReplayAttackError()
    }

    const callerUserId = this.extractCallerUserId(req)

    return {
      callerName: auth.callerName,
      callerUserId,
      method,
      parsedBody,
      path,
      requestId: auth.requestId,
      searchParams: url.searchParams,
    }
  }

  /**
   * Извлекает telegramUserId из подписанного заголовка запроса.
   *
   * Возвращает undefined, если userIdSigningSecret не настроен — этот секрет
   * опционален и нужен только когда gateway передаёт userId через заголовок.
   */
  private extractCallerUserId(req: IncomingMessage): number | undefined {
    if (!this.deps.config.userIdSigningSecret) return undefined

    try {
      return extractUserId(req, this.deps.config.userIdSigningSecret)
    } catch {
      throw new AuthenticationError('invalid user identity')
    }
  }

  /**
   * Выбирает доменный обработчик по методу и пути запроса.
   */
  private async dispatch(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const { method, path } = context

    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    if (method === 'GET' && path === '/connections') {
      return { body: await this.listConnections(context), statusCode: 200 }
    }

    if (method === 'POST' && path === '/auth-url') {
      return { body: await this.buildAuthUrl(context), statusCode: 200 }
    }

    if (method === 'POST' && path === '/oauth-callback') {
      return { body: await this.handleOAuthCallback(context), statusCode: 201 }
    }

    if (method === 'POST' && path === '/refresh-token') {
      return { body: await this.handleRefreshToken(context), statusCode: 200 }
    }

    if (method === 'DELETE' && path === '/connections') {
      return { body: await this.deleteConnection(context), statusCode: 200 }
    }

    throw new NotFoundError()
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listConnections(context: RequestContext): Promise<unknown[]> {
    const userId = resolveUserId(context.callerUserId, context.searchParams.get('telegramUserId'))
    const scope = context.searchParams.get('scope')
    const where: Record<string, unknown> = { telegramUserId: BigInt(userId) }

    if (scope) where.scope = scope

    const rows = await this.deps.prisma.calendarConnection.findMany({ where })
    return rows.map((row) => this.decryptRow(row))
  }

  /**
   * Выполняет шаг buildAuthUrl внутри сервисного сценария.
   */
  private async buildAuthUrl(context: RequestContext): Promise<{ url: string }> {
    const body = context.parsedBody as { provider?: unknown; telegramUserId?: unknown; scope?: unknown; resourceId?: unknown }

    if (body.provider !== 'google' || !this.deps.config.googleClientId) {
      throw new ProviderNotConfiguredError()
    }

    const userId = resolveUserId(context.callerUserId, body.telegramUserId)
    const scope = typeof body.scope === 'string' ? body.scope : 'user'
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId : undefined

    // state подписывается HMAC — защита от подделки telegramUserId в OAuth redirect
    const state = signOAuthState({ telegramUserId: userId, scope, resourceId }, this.deps.config.tokenSecret)
    const url = this.deps.googleOAuthClient.buildAuthUrl(state)

    return { url }
  }

  /**
   * Выполняет шаг handleOAuthCallback внутри сервисного сценария.
   */
  private async handleOAuthCallback(context: RequestContext): Promise<unknown> {
    const body = context.parsedBody as { code?: unknown; state?: unknown }

    if (typeof body.code !== 'string' || typeof body.state !== 'string') {
      throw new ValidationError('code and state are required')
    }

    let stateData: OAuthStateData
    try {
      stateData = verifyOAuthState(body.state, this.deps.config.tokenSecret) as OAuthStateData
    } catch {
      throw new OAuthStateError()
    }

    // exchangeCode бросает ошибку если Google не вернул refresh_token —
    // fallback к access_token запрещён, access token истекает через ~1 час
    const token = await this.deps.googleOAuthClient.exchangeCode(body.code)

    const conn = await this.deps.prisma.calendarConnection.upsert({
      where: {
        provider_scope_telegramUserId_resourceId: {
          provider: 'google',
          scope: stateData.scope,
          telegramUserId: BigInt(stateData.telegramUserId),
          resourceId: stateData.resourceId ?? null,
        },
      },
      update: {
        accessToken: encrypt(token.access_token, this.deps.config.tokenSecret),
        refreshToken: encrypt(token.refresh_token, this.deps.config.tokenSecret),
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      },
      create: {
        provider: 'google',
        scope: stateData.scope,
        telegramUserId: BigInt(stateData.telegramUserId),
        resourceId: stateData.resourceId,
        calendarId: 'primary',
        accessToken: encrypt(token.access_token, this.deps.config.tokenSecret),
        refreshToken: encrypt(token.refresh_token, this.deps.config.tokenSecret),
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      },
    })

    audit({
      ts: new Date().toISOString(),
      service: 'calendar',
      action: 'calendar.connected',
      userId: stateData.telegramUserId,
      provider: 'google',
      requestId: context.requestId,
    })

    return this.decryptRow(conn)
  }

  /**
   * Обновляет access token через refresh token.
   *
   * Вызывается когда caller обнаруживает, что expiresAt уже прошёл.
   * Новый access token сохраняется в БД — refresh token при этом не меняется.
   */
  private async handleRefreshToken(context: RequestContext): Promise<unknown> {
    const body = context.parsedBody as { provider?: unknown; telegramUserId?: unknown; scope?: unknown }

    if (typeof body.provider !== 'string') {
      throw new ValidationError('provider is required')
    }

    const userId = resolveUserId(context.callerUserId, body.telegramUserId)
    const scope = typeof body.scope === 'string' ? body.scope : 'user'

    const conn = await this.deps.prisma.calendarConnection.findFirst({
      where: { provider: body.provider, scope, telegramUserId: BigInt(userId) },
    })

    if (!conn) {
      throw new NotFoundError()
    }

    const refreshToken = decrypt(conn.refreshToken, this.deps.config.tokenSecret)
    const refreshed = await this.deps.googleOAuthClient.refreshAccessToken(refreshToken)

    const updated = await this.deps.prisma.calendarConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encrypt(refreshed.access_token, this.deps.config.tokenSecret),
        expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
      },
    })

    return this.decryptRow(updated)
  }

  /**
   * Удаляет подключение к Google Calendar.
   *
   * Перед удалением из БД отзывает refresh token на стороне Google.
   * Ошибка revoke не прерывает disconnect — пользователь должен иметь
   * возможность отвязать аккаунт даже при недоступности Google API.
   */
  private async deleteConnection(context: RequestContext): Promise<{ ok: boolean }> {
    const body = context.parsedBody as { provider?: unknown; telegramUserId?: unknown }

    if (typeof body.provider !== 'string') {
      throw new ValidationError('provider is required')
    }

    const userId = resolveUserId(context.callerUserId, body.telegramUserId)

    // Находим все подключения, чтобы отозвать токены перед удалением
    const connections = await this.deps.prisma.calendarConnection.findMany({
      where: { provider: body.provider, scope: 'user', telegramUserId: BigInt(userId) },
    })

    // Отзываем refresh tokens на стороне Google
    // Ошибка revoke логируется, но не блокирует disconnect
    for (const conn of connections) {
      try {
        const refreshToken = decrypt(conn.refreshToken, this.deps.config.tokenSecret)
        await this.deps.googleOAuthClient.revokeToken(refreshToken)
      } catch (err) {
        this.deps.logger.error({
          error: err,
          message: 'Failed to revoke Google token on disconnect — proceeding with local deletion',
          service: 'calendar-service',
        })
      }
    }

    await this.deps.prisma.calendarConnection.deleteMany({
      where: { provider: body.provider, scope: 'user', telegramUserId: BigInt(userId) },
    })

    audit({
      ts: new Date().toISOString(),
      service: 'calendar',
      action: 'calendar.disconnected',
      userId,
      provider: body.provider,
      requestId: context.requestId,
    })

    return { ok: true }
  }

  /**
   * Расшифровывает токены перед отдачей caller.
   *
   * Токены хранятся зашифрованными в БД — в ответе отдаются в открытом виде
   * только через service-to-service канал с проверенной аутентификацией.
   */
  private decryptRow(row: CalendarConnectionRow): Record<string, unknown> {
    return {
      ...row,
      telegramUserId: Number(row.telegramUserId),
      expiresAt: row.expiresAt?.toISOString() ?? undefined,
      accessToken: row.accessToken ? decrypt(row.accessToken, this.deps.config.tokenSecret) : undefined,
      refreshToken: decrypt(row.refreshToken, this.deps.config.tokenSecret),
    }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof CalendarServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    this.deps.logger.error({
      error,
      message: 'Unhandled calendar-service error',
      service: 'calendar-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

/**
 * Выбирает доверенный user id из подписи или payload.
 */
function resolveUserId(callerUserId: number | undefined, rawValue: unknown): number {
  const userId = callerUserId ?? Number(rawValue)
  if (!userId || !Number.isFinite(userId) || userId <= 0) {
    throw new ValidationError('telegramUserId is required and must be a positive integer')
  }

  return userId
}

/**
 * Читает тело HTTP-запроса и безопасно парсит JSON.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  const result = await readJsonBody<unknown>(req)
  return { parsedBody: result.parsed, rawBody: result.raw }
}
