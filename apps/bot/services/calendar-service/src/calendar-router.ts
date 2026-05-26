import { audit, extractUserId, readJsonBody, signOAuthState, verifyOAuthState, verifyServiceRequest } from '@metrix/auth'
import { writeAuditLog, type AuditLogInput } from '@metrix/audit-log'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { CalendarServiceConfig } from './config.js'
import { AuthenticationError, CalendarServiceError, NotFoundError, OAuthStateError, ProviderError, ProviderNotConfiguredError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import { decrypt, encrypt } from './crypto.js'
import type { CalendarServiceLogger } from './logger.js'
import type { GoogleOAuthClient } from './google-oauth-client.js'
import { parseBuildAuthUrlInput, parseDeleteConnectionInput, parseOAuthCallbackInput, parseRefreshTokenInput, resolveUserId } from './validation.js'

// Сколько секунд хранить replay-ключ в Redis.
// 300 секунд совпадает с окном security/admin и временем жизни service-to-service nonce.
const REPLAY_TTL_SECONDS = 300

// Все зависимости router-а приходят снаружи.
type CalendarRouterDependencies = {
  // Конфиг с OAuth-секретами, Redis URL и token secret.
  config: CalendarServiceConfig
  // Клиент для Google OAuth API.
  googleOAuthClient: GoogleOAuthClient
  // JSON-логгер сервиса.
  logger: CalendarServiceLogger
  // Prisma для calendarConnection записей.
  prisma: PrismaClient
  // Redis для replay-защиты.
  redis: Redis
}

// Контекст одного HTTP-запроса после auth и разбора body.
type RequestContext = {
  // Имя сервиса, который вызвал calendar-service.
  callerName: string
  // Telegram user id, если caller передал подписанный заголовок.
  callerUserId: number | undefined
  // HTTP-метод.
  method: string
  // Распарсенное тело запроса.
  parsedBody: unknown
  // URL path без query string.
  path: string
  // Уникальный request id.
  requestId: string
  // Query-параметры.
  searchParams: URLSearchParams
}

// Минимальная форма calendarConnection из базы.
type CalendarConnectionRow = {
  // Access token может отсутствовать или истечь.
  accessToken?: string | null
  // Когда access token истекает.
  expiresAt?: Date | null
  // Refresh token обязателен для долгого подключения календаря.
  refreshToken: string
  // Telegram user id хранится в базе как BigInt.
  telegramUserId: bigint
  [key: string]: unknown
}

// Данные, которые подписываем и кладём в OAuth state.
type OAuthStateData = {
  // Пользователь, который начал OAuth flow.
  telegramUserId: number
  // Тип подключения: user/resource и т.д.
  scope: string
  // Optional ресурс, если календарь привязан к конкретной комнате.
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
      // Сначала собираем context и проверяем подпись.
      const context = await this.createRequestContext(req)
      // Затем выбираем route handler.
      const result = await this.dispatch(context)
      // Успешный ответ отправляем JSON-ом.
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      // Ошибки тоже превращаем в JSON-ответ.
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    // IncomingMessage содержит относительный URL, поэтому добавляем base.
    const url = new URL(req.url ?? '/', `http://localhost:${this.deps.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // Health endpoint не требует service-to-service auth.
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', callerUserId: undefined, method, parsedBody: {}, path, requestId: 'health-check', searchParams: url.searchParams }
    }

    // rawBody нужен для проверки подписи, parsedBody — для handlers.
    const { parsedBody, rawBody } = await readRequestBody(req, method)
    // Проверяем, что запрос пришёл от доверенного сервиса.
    const auth = verifyServiceRequest(req, rawBody, this.deps.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    // NX защищает от повторного использования requestId.
    const fresh = await this.deps.redis.set(`replay:${auth.requestId}`, '1', 'EX', REPLAY_TTL_SECONDS, 'NX')
    if (fresh !== 'OK') {
      throw new ReplayAttackError()
    }

    // Если caller передал подписанный user id, достаём его отдельно.
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
    // Если секрет не настроен, user id из заголовка не принимаем.
    if (!this.deps.config.userIdSigningSecret) return undefined

    try {
      // extractUserId проверяет подпись, а не просто доверяет заголовку.
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

    // Простая проверка живости процесса.
    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    // Список подключённых календарей пользователя.
    if (method === 'GET' && path === '/connections') {
      return { body: await this.listConnections(context), statusCode: 200 }
    }

    // Создать Google OAuth URL для подключения календаря.
    if (method === 'POST' && path === '/auth-url') {
      return { body: await this.buildAuthUrl(context), statusCode: 200 }
    }

    // Обработать code/state после OAuth redirect.
    if (method === 'POST' && path === '/oauth-callback') {
      return { body: await this.handleOAuthCallback(context), statusCode: 201 }
    }

    // Обновить access token через refresh token.
    if (method === 'POST' && path === '/refresh-token') {
      return { body: await this.handleRefreshToken(context), statusCode: 200 }
    }

    // Отключить календарь и удалить локальные токены.
    if (method === 'DELETE' && path === '/connections') {
      return { body: await this.deleteConnection(context), statusCode: 200 }
    }

    // Остальные route-ы не поддерживаются.
    throw new NotFoundError()
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listConnections(context: RequestContext): Promise<unknown[]> {
    // user id берём из подписанного заголовка или из query fallback.
    const userId = resolveUserId(context.callerUserId, context.searchParams.get('telegramUserId'))
    // scope позволяет отфильтровать user/resource подключения.
    const scope = context.searchParams.get('scope')
    const where: Record<string, unknown> = { telegramUserId: BigInt(userId) }

    if (scope) where.scope = scope

    // В ответе токены расшифровываются только после service-to-service auth.
    const rows = await this.deps.prisma.calendarConnection.findMany({ where })
    return rows.map((row) => this.decryptRow(row))
  }

  /**
   * Выполняет шаг buildAuthUrl внутри сервисного сценария.
   */
  private async buildAuthUrl(context: RequestContext): Promise<{ url: string }> {
    // Валидируем provider, user id, scope и optional resourceId.
    const input = parseBuildAuthUrlInput(context.parsedBody, context.callerUserId)

    if (!this.deps.config.googleClientId || !this.deps.config.googleClientSecret) {
      throw new ProviderNotConfiguredError()
    }

    // state подписывается HMAC — защита от подделки telegramUserId в OAuth redirect.
    const state = signOAuthState(
      { telegramUserId: input.telegramUserId, scope: input.scope, resourceId: input.resourceId },
      this.deps.config.tokenSecret,
    )
    const url = this.deps.googleOAuthClient.buildAuthUrl(state)

    return { url }
  }

  /**
   * Выполняет шаг handleOAuthCallback внутри сервисного сценария.
   */
  private async handleOAuthCallback(context: RequestContext): Promise<unknown> {
    // Google возвращает code и state после consent.
    const input = parseOAuthCallbackInput(context.parsedBody)

    let stateData: OAuthStateData
    try {
      // Проверяем подпись state и достаём user id/scope/resourceId.
      stateData = verifyOAuthState(input.state, this.deps.config.tokenSecret) as OAuthStateData
    } catch {
      throw new OAuthStateError()
    }

    // exchangeCode бросает ошибку если Google не вернул refresh_token.
    // Fallback к access_token запрещён, access token истекает примерно через час.
    const token = await this.deps.googleOAuthClient.exchangeCode(input.code)

    // Nullable resourceId нельзя надёжно использовать через compound upsert.
    // Поэтому сначала ищем существующую запись, затем обновляем или создаём.
    const where = {
      provider: 'google',
      scope: stateData.scope,
      telegramUserId: BigInt(stateData.telegramUserId),
      resourceId: stateData.resourceId ?? null,
    }
    const existing = await this.deps.prisma.calendarConnection.findFirst({ where })
    const conn = existing
      ? await this.deps.prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          // Токены всегда храним зашифрованными.
          accessToken: encrypt(token.access_token, this.deps.config.tokenSecret),
          refreshToken: encrypt(token.refresh_token, this.deps.config.tokenSecret),
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
      })
      : await this.deps.prisma.calendarConnection.create({
        data: {
          provider: 'google',
          scope: stateData.scope,
          telegramUserId: BigInt(stateData.telegramUserId),
          resourceId: stateData.resourceId ?? null,
          // primary — основной календарь Google пользователя.
          calendarId: 'primary',
          accessToken: encrypt(token.access_token, this.deps.config.tokenSecret),
          refreshToken: encrypt(token.refresh_token, this.deps.config.tokenSecret),
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
      })

    // Audit фиксирует факт подключения календаря.
    audit({
      ts: new Date().toISOString(),
      service: 'calendar',
      action: 'calendar.connected',
      userId: stateData.telegramUserId,
      provider: 'google',
      requestId: context.requestId,
    })
    // Persistent audit log нужен для dashboard и расследований.
    await this.writeAudit({
      action: 'calendar.connected',
      actorUserId: stateData.telegramUserId,
      callerService: context.callerName,
      entityId: conn.id,
      entityType: 'calendarConnection',
      payload: { provider: 'google', scope: stateData.scope, resourceId: stateData.resourceId ?? null },
      requestId: context.requestId,
      service: 'calendar',
    })

    // Caller получает расшифрованные токены через доверенный канал.
    return this.decryptRow(conn)
  }

  /**
   * Обновляет access token через refresh token.
   *
   * Вызывается когда caller обнаруживает, что expiresAt уже прошёл.
   * Новый access token сохраняется в БД — refresh token при этом не меняется.
   */
  private async handleRefreshToken(context: RequestContext): Promise<unknown> {
    // Валидируем provider, scope и владельца подключения.
    const input = parseRefreshTokenInput(context.parsedBody, context.callerUserId)

    // Ищем существующее подключение календаря.
    const conn = await this.deps.prisma.calendarConnection.findFirst({
      where: { provider: input.provider, scope: input.scope, telegramUserId: BigInt(input.telegramUserId) },
    })

    if (!conn) {
      throw new NotFoundError()
    }

    // Refresh token в базе зашифрован, перед Google-запросом его нужно расшифровать.
    const refreshToken = decrypt(conn.refreshToken, this.deps.config.tokenSecret)
    const refreshed = await this.deps.googleOAuthClient.refreshAccessToken(refreshToken)

    // Сохраняем новый access token и новый expiresAt.
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
    // Provider и user id определяют, какие подключения удалить.
    const input = parseDeleteConnectionInput(context.parsedBody, context.callerUserId)

    // Находим все подключения, чтобы отозвать токены перед удалением.
    const connections = await this.deps.prisma.calendarConnection.findMany({
      where: { provider: input.provider, scope: 'user', telegramUserId: BigInt(input.telegramUserId) },
    })

    // Отзываем refresh tokens на стороне Google.
    // Ошибка revoke логируется, но не блокирует disconnect.
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

    // После попыток revoke удаляем локальные записи.
    await this.deps.prisma.calendarConnection.deleteMany({
      where: { provider: input.provider, scope: 'user', telegramUserId: BigInt(input.telegramUserId) },
    })

    // Audit фиксирует отключение календаря.
    audit({
      ts: new Date().toISOString(),
      service: 'calendar',
      action: 'calendar.disconnected',
      userId: input.telegramUserId,
      provider: input.provider,
      requestId: context.requestId,
    })
    // Persistent audit log пишем отдельно и не блокируем disconnect при ошибке.
    await this.writeAudit({
      action: 'calendar.disconnected',
      actorUserId: input.telegramUserId,
      callerService: context.callerName,
      entityType: 'calendarConnection',
      payload: { connectionIds: connections.map((connection) => connection.id), provider: input.provider },
      requestId: context.requestId,
      service: 'calendar',
    })

    return { ok: true }
  }

  /**
   * Пишет persistent audit log без влияния на основной бизнес-flow.
   */
  private async writeAudit(input: AuditLogInput): Promise<void> {
    try {
      // Пишем audit log в PostgreSQL.
      await writeAuditLog(this.deps.prisma, input)
    } catch (error) {
      // Audit не должен ломать пользовательский сценарий.
      this.deps.logger.error({
        action: 'audit.persist.failed',
        error,
        message: 'Failed to persist audit log',
        service: 'calendar-service',
      })
    }
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
      // BigInt нельзя напрямую сериализовать в JSON.
      telegramUserId: Number(row.telegramUserId),
      // Date переводим в ISO-строку.
      expiresAt: row.expiresAt?.toISOString() ?? undefined,
      // accessToken optional, refreshToken обязателен.
      accessToken: row.accessToken ? decrypt(row.accessToken, this.deps.config.tokenSecret) : undefined,
      refreshToken: decrypt(row.refreshToken, this.deps.config.tokenSecret),
    }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    // ProviderError несёт реальный статус и тело от Google OAuth API.
    if (error instanceof ProviderError) {
      sendJson(res, error.responseBody, error.statusCode)
      return
    }

    // Доменные ошибки уже содержат HTTP status code.
    if (error instanceof CalendarServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // Неожиданные ошибки логируем, клиенту отдаём нейтральный ответ.
    this.deps.logger.error({
      error,
      message: 'Unhandled calendar-service error',
      service: 'calendar-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

/**
 * Читает тело HTTP-запроса и безопасно парсит JSON.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  // GET-запросы не используют body.
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  // readJsonBody возвращает parsed JSON и исходную строку для проверки подписи.
  const result = await readJsonBody<unknown>(req)
  return { parsedBody: result.parsed, rawBody: result.raw }
}
