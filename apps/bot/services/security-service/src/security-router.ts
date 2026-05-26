import { readJsonBody, verifyServiceRequest } from '@metrix/auth'
import type { Redis } from 'ioredis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { SecurityServiceConfig } from './config.js'
import { AuthenticationError, NotFoundError, ReplayAttackError, SecurityServiceError, TooManyRequestsError } from './errors.js'
import { sendJson } from './http-response.js'
import { createJwt, verifyJwt } from './jwt.js'
import { checkLoginAllowed, recordFailedLogin, resetLoginAttempts } from './login-rate-limiter.js'
import type { SecurityServiceLogger } from './logger.js'
import { ACCESS_TOKEN_TTL_SECONDS, createSession, deleteAllUserSessions, deleteSession, rotateSession } from './session-store.js'
import { isTokenRevoked, revokeToken } from './token-blacklist.js'
import {
  parseCreateSessionInput,
  parseDeleteAllSessionsInput,
  parseDeleteSessionInput,
  parseLoginIdentifierInput,
  parseRotateSessionInput,
  parseTokenInput,
} from './validation.js'

// зависимости, которые нужны роутеру для работы
type SecurityRouterDependencies = {
  // конфиг сервиса: порт, ключи, trusted callers
  config: SecurityServiceConfig
  // структурированный логгер
  logger: SecurityServiceLogger
  // Prisma для работы с сессиями
  prisma: PrismaClient
  // Redis для blacklist и rate limiter
  redis: Redis
} 

// контекст одного HTTP-запроса после прохождения auth
type RequestContext = {
  // имя сервиса, который обратился к нам
  callerName: string
  // HTTP-метод
  method: string
  // распарсенный JSON body
  parsedBody: unknown
  // путь запроса
  path: string
  // requestId для replay-защиты
  requestId: string
}

/**
 * Обрабатывает входящие HTTP-запросы security-service.
 *
 * Каждый endpoint отвечает за отдельную часть безопасности:
 * сессии, токены, brute-force защита.
 * Все маршруты, кроме /health и /ready, защищены service-to-service HMAC.
 */
export class SecurityRouter {
  /**
   * Сохраняет зависимости для последующих обработчиков.
   */
  constructor(private readonly deps: SecurityRouterDependencies) {}

  /**
   * Точка входа для всех HTTP-запросов.
   * Собирает контекст, диспатчит на нужный handler, возвращает ответ.
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
   * Парсит запрос и проверяет service-to-service подпись.
   * /health пропускается без проверки подписи.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    const url = new URL(req.url ?? '/', `http://localhost:${this.deps.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // health доступен без аутентификации — нужен для liveness probe
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', method, parsedBody: {}, path, requestId: 'health-check' }
    }

    // rawBody нужен для проверки подписи, parsedBody — для бизнес-логики
    const { parsedBody, rawBody } = await readRequestBody(req, method)

    // проверяем HMAC-подпись от вызывающего сервиса
    const auth = verifyServiceRequest(req, rawBody, this.deps.config.trustedCallers)
    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    // replay-защита: requestId не должен повторяться
    const isReplay = await this.deps.redis.set(
      `security:replay:${auth.requestId}`,
      '1',
      'EX',
      300,
      'NX',
    )
    if (isReplay === null) {
      throw new ReplayAttackError()
    }

    return {
      callerName: auth.callerName,
      method,
      parsedBody,
      path,
      requestId: auth.requestId,
    }
  }

  /**
   * Выбирает нужный обработчик по методу и пути.
   */
  private async dispatch(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const { method, path } = context

    // --- liveness ---

    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    // --- сессии ---

    // создать новую сессию после успешной проверки пароля
    if (method === 'POST' && path === '/sessions') {
      return { body: await this.createSession(context), statusCode: 201 }
    }

    // ротировать refresh token и получить новую пару токенов
    if (method === 'POST' && path === '/sessions/rotate') {
      return { body: await this.rotateSession(context), statusCode: 200 }
    }

    // logout: удалить сессию и добавить access token в blacklist
    if (method === 'DELETE' && path === '/sessions') {
      return { body: await this.deleteSession(context), statusCode: 200 }
    }

    // принудительно завершить все сессии пользователя
    if (method === 'DELETE' && path === '/sessions/all') {
      return { body: await this.deleteAllSessions(context), statusCode: 200 }
    }

    // --- токены ---

    // проверить JWT и вернуть identity пользователя
    if (method === 'POST' && path === '/tokens/verify') {
      return { body: await this.verifyToken(context), statusCode: 200 }
    }

    // добавить access token в blacklist
    if (method === 'POST' && path === '/tokens/revoke') {
      return { body: await this.revokeToken(context), statusCode: 200 }
    }

    // --- brute-force защита ---

    // проверить, не заблокирован ли вход по IP или userId
    if (method === 'POST' && path === '/login/check') {
      return { body: await this.checkLogin(context), statusCode: 200 }
    }

    // записать неудачную попытку входа
    if (method === 'POST' && path === '/login/failure') {
      return { body: await this.recordFailure(context), statusCode: 200 }
    }

    // сбросить счётчик после успешного входа
    if (method === 'POST' && path === '/login/reset') {
      return { body: await this.resetAttempts(context), statusCode: 200 }
    }

    throw new NotFoundError()
  }

  // ---- обработчики сессий ----

  /**
   * Создаёт новую сессию и возвращает пару токенов.
   *
   * Вызывается после того, как caller-сервис уже проверил пароль пользователя.
   * security-service не знает о паролях — он только выпускает токены.
   */
  private async createSession(context: RequestContext): Promise<unknown> {
    const input = parseCreateSessionInput(context.parsedBody)

    const session = await createSession({
      prisma: this.deps.prisma,
      userId: input.userId,
      userRole: input.userRole,
    })

    // access token создаём здесь, после получения session данных из БД
    const accessToken = createJwt({
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      keys: this.deps.config.jwtKeys,
      role: session.userRole as 'admin' | 'employee',
      userId: session.userId,
    })

    this.deps.logger.info({
      action: 'session.created',
      message: 'Новая сессия создана',
      requestId: context.requestId,
      service: 'security-service',
      userId: session.userId,
    })

    return {
      accessToken,
      expiresAt: session.expiresAt.toISOString(),
      refreshToken: session.refreshToken,
    }
  }

  /**
   * Ротирует refresh token: старый удаляется, выдаётся новая пара токенов.
   *
   * Каждый refresh token одноразовый.
   * Если токен уже использован — возвращаем 401 (возможна кража).
   */
  private async rotateSession(context: RequestContext): Promise<unknown> {
    const input = parseRotateSessionInput(context.parsedBody)

    const result = await rotateSession({
      prisma: this.deps.prisma,
      refreshToken: input.refreshToken,
    })

    // токен не найден — либо уже использован, либо никогда не существовал
    if (result.status === 'not_found') {
      this.deps.logger.warn({
        action: 'session.rotate.not_found',
        message: 'Попытка ротации несуществующего refresh token',
        requestId: context.requestId,
        service: 'security-service',
      })
      throw new AuthenticationError('refresh token not found')
    }

    // сессия истекла — нужна повторная аутентификация
    if (result.status === 'expired') {
      throw new AuthenticationError('session expired')
    }

    // создаём новый access token для обновлённой сессии
    const accessToken = createJwt({
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      keys: this.deps.config.jwtKeys,
      role: result.userRole as 'admin' | 'employee',
      userId: result.userId as string,
    })

    this.deps.logger.info({
      action: 'session.rotated',
      message: 'Refresh token ротирован',
      requestId: context.requestId,
      service: 'security-service',
      userId: result.userId,
    })

    return {
      accessToken,
      refreshToken: result.tokens.refreshToken,
    }
  }

  /**
   * Удаляет сессию (logout) и добавляет access token в blacklist.
   *
   * После этого старый access token больше не пройдёт /tokens/verify,
   * даже если его TTL ещё не истёк.
   */
  private async deleteSession(context: RequestContext): Promise<{ ok: boolean }> {
    const input = parseDeleteSessionInput(context.parsedBody)

    // удаляем сессию из БД
    await deleteSession({
      prisma: this.deps.prisma,
      refreshToken: input.refreshToken,
    })

    // если caller передал access token — немедленно его отзываем
    if (input.accessToken) {
      await revokeToken(input.accessToken, this.deps.redis)
    }

    this.deps.logger.info({
      action: 'session.deleted',
      message: 'Сессия удалена (logout)',
      requestId: context.requestId,
      service: 'security-service',
    })

    return { ok: true }
  }

  /**
   * Удаляет все сессии пользователя.
   *
   * Используется при смене пароля или компрометации аккаунта.
   * Access tokens продолжат работать до истечения TTL (15 минут),
   * если caller не отзывает их отдельно через /tokens/revoke.
   */
  private async deleteAllSessions(context: RequestContext): Promise<{ ok: boolean; deletedCount: number }> {
    const input = parseDeleteAllSessionsInput(context.parsedBody)

    const deletedCount = await deleteAllUserSessions({
      prisma: this.deps.prisma,
      userId: input.userId,
    })

    this.deps.logger.warn({
      action: 'session.all_deleted',
      deletedCount,
      message: 'Все сессии пользователя удалены',
      requestId: context.requestId,
      service: 'security-service',
      userId: input.userId,
    })

    return { ok: true, deletedCount }
  }

  // ---- обработчики токенов ----

  /**
   * Проверяет JWT: подпись, срок жизни, наличие в blacklist.
   *
   * Возвращает identity пользователя {id, role} если токен валиден.
   * Используется другими сервисами для аутентификации запросов.
   */
  private async verifyToken(context: RequestContext): Promise<{ id: string; role: string }> {
    const input = parseTokenInput(context.parsedBody)

    // проверяем подпись и срок жизни JWT
    const result = verifyJwt(input.token, this.deps.config.jwtKeys)
    if (result.status === 'error') {
      throw new AuthenticationError(result.message)
    }

    // проверяем, не был ли токен отозван через /tokens/revoke
    const revoked = await isTokenRevoked(input.token, this.deps.redis)
    if (revoked) {
      throw new AuthenticationError('token has been revoked')
    }

    return { id: result.payload.sub, role: result.payload.role }
  }

  /**
   * Добавляет access token в Redis blacklist.
   *
   * Вызывается при logout и смене пароля, чтобы токен перестал
   * работать раньше истечения TTL.
   */
  private async revokeToken(context: RequestContext): Promise<{ ok: boolean }> {
    const input = parseTokenInput(context.parsedBody)

    await revokeToken(input.token, this.deps.redis)

    this.deps.logger.info({
      action: 'token.revoked',
      message: 'Access token добавлен в blacklist',
      requestId: context.requestId,
      service: 'security-service',
    })

    return { ok: true }
  }

  // ---- обработчики brute-force защиты ----

  /**
   * Проверяет, не заблокирован ли вход по identifier (IP или userId).
   *
   * Caller вызывает дважды: для IP и для userId, и блокирует
   * если хоть один заблокирован.
   */
  private async checkLogin(context: RequestContext): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    const input = parseLoginIdentifierInput(context.parsedBody)

    const result = await checkLoginAllowed(input.identifier, this.deps.redis)

    if (result.status === 'locked') {
      // не бросаем ошибку — caller сам решает, что делать
      return { allowed: false, retryAfterSeconds: result.retryAfterSeconds }
    }

    return { allowed: true }
  }

  /**
   * Записывает неудачную попытку входа и при необходимости блокирует.
   *
   * Exponential backoff: каждая попытка сверх лимита удваивает время блокировки.
   */
  private async recordFailure(context: RequestContext): Promise<{ ok: boolean; locked?: boolean; retryAfterSeconds?: number }> {
    const input = parseLoginIdentifierInput(context.parsedBody)

    await recordFailedLogin(input.identifier, this.deps.redis)

    // проверяем, не заблокировали ли мы этот identifier только что
    const check = await checkLoginAllowed(input.identifier, this.deps.redis)

    if (check.status === 'locked') {
      this.deps.logger.warn({
        action: 'login.locked',
        identifier: input.identifier,
        message: 'Вход заблокирован после превышения лимита попыток',
        requestId: context.requestId,
        retryAfterSeconds: check.retryAfterSeconds,
        service: 'security-service',
      })
      return { ok: true, locked: true, retryAfterSeconds: check.retryAfterSeconds }
    }

    return { ok: true }
  }

  /**
   * Сбрасывает счётчик неудачных попыток после успешного входа.
   *
   * Вызывается сразу после подтверждения пароля, до создания сессии.
   */
  private async resetAttempts(context: RequestContext): Promise<{ ok: boolean }> {
    const input = parseLoginIdentifierInput(context.parsedBody)

    await resetLoginAttempts(input.identifier, this.deps.redis)

    return { ok: true }
  }

  // ---- обработка ошибок ----

  /**
   * Переводит доменные ошибки в HTTP-ответы.
   * Неожиданные ошибки логируются и возвращаются как 500.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    // TooManyRequestsError добавляет Retry-After заголовок
    if (error instanceof TooManyRequestsError) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // остальные доменные ошибки знают свой HTTP status code
    if (error instanceof SecurityServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // неожиданные ошибки логируем и скрываем детали от caller
    this.deps.logger.error({
      error,
      message: 'Необработанная ошибка security-service',
      service: 'security-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

/**
 * Читает тело HTTP-запроса и парсит JSON.
 * GET-запросы не имеют body.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  // readJsonBody возвращает parsed и raw body (raw нужен для проверки HMAC-подписи)
  const result = await readJsonBody<unknown>(req)
  return { parsedBody: result.parsed, rawBody: result.raw }
}
