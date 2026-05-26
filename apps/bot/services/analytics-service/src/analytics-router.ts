import { readJsonBody, verifyServiceRequest } from '@metrix/auth'
import type { PrismaClient } from '@prisma/client'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RedisBus } from '@metrix/redis-bus'
import type { AnalyticsServiceConfig } from './config.js'
import { AnalyticsServiceError, AuthenticationError, DownstreamServiceError, NotFoundError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import type { AnalyticsServiceLogger } from './logger.js'
import type { BookingClient } from './booking-client.js'
import { calculateStats, calculateSummary } from './analytics-calculations.js'
import { parseCreateReportInput, readIdFromPath } from './validation.js'

// Все зависимости router-а приходят снаружи.
type AnalyticsRouterDependencies = {
  // Клиент для чтения бронирований из booking-service.
  bookingClient: BookingClient
  // RedisBus нужен для replay-защиты requestId.
  bus: RedisBus
  // Runtime-конфиг сервиса.
  config: AnalyticsServiceConfig
  // JSON-логгер.
  logger: AnalyticsServiceLogger
  // Prisma для report-записей.
  prisma: PrismaClient
}

// Контекст одного HTTP-запроса после разбора и авторизации.
type RequestContext = {
  // Имя сервиса, который вызвал analytics-service.
  callerName: string
  // HTTP-метод.
  method: string
  // Распарсенное JSON-тело.
  parsedBody: unknown
  // URL path без query string.
  path: string
  // Уникальный id запроса.
  requestId: string
}

/**
 * Обрабатывает HTTP-запросы analytics-service.
 *
 * Router держит транспортную логику отдельно от расчётов, чтобы метрики можно
 * было тестировать без HTTP, Redis и Prisma.
 */
export class AnalyticsRouter {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly dependencies: AnalyticsRouterDependencies) {}

  /**
   * Обрабатывает входящий HTTP-запрос и отправляет результат или ошибку.
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Сначала проверяем auth и собираем контекст.
      const context = await this.createRequestContext(req)
      // Потом выбираем обработчик по route.
      const result = await this.dispatch(context)
      // Успешный ответ отправляем JSON-ом.
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      // Ошибки превращаем в понятные HTTP-ответы.
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    // IncomingMessage содержит относительный URL, поэтому нужен base.
    const url = new URL(req.url ?? '/', `http://localhost:${this.dependencies.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // Health endpoint открыт для инфраструктуры без подписи.
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', method, parsedBody: {}, path, requestId: 'health-check' }
    }

    // rawBody нужен для проверки подписи, parsedBody — для бизнес-логики.
    const { parsedBody, rawBody } = await readRequestBody(req, method)
    // Проверяем, что запрос пришёл от доверенного сервиса.
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    // Один requestId можно обработать только один раз за короткое окно.
    const fresh = await this.dependencies.bus.checkReplay(auth.requestId)
    if (!fresh) {
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
   * Выбирает доменный обработчик по методу и пути запроса.
   */
  private async dispatch(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const { method, path } = context

    // Быстрая проверка живости процесса.
    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    // Stats — короткие счётчики и revenue.
    if (method === 'GET' && path === '/stats') {
      // Сырые факты бронирований берём из booking-service.
      const bookings = await this.dependencies.bookingClient.listBookings()
      return { body: calculateStats(bookings), statusCode: 200 }
    }

    // Summary — агрегаты за последние 30 дней.
    if (method === 'GET' && path === '/summary') {
      const bookings = await this.dependencies.bookingClient.listBookings()
      return { body: calculateSummary(bookings), statusCode: 200 }
    }

    // Создание async report-записи.
    if (method === 'POST' && path === '/reports') {
      return { body: await this.createReport(context), statusCode: 201 }
    }

    // Получение report по id.
    if (method === 'GET' && path.startsWith('/reports/')) {
      return { body: await this.getReport(context), statusCode: 200 }
    }

    // Остальные route-ы не поддерживаются.
    throw new NotFoundError()
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   */
  private async createReport(context: RequestContext): Promise<unknown> {
    // Валидируем тип отчёта и optional requestedBy.
    const input = parseCreateReportInput(context.parsedBody)
    // Сам отчёт сначала создаётся в pending-статусе.
    const report = await this.dependencies.prisma.report.create({
      data: {
        requestedBy: input.requestedBy,
        status: 'pending',
        type: input.type,
      },
    })

    return {
      reportId: report.id,
      status: report.status,
    }
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private async getReport(context: RequestContext): Promise<unknown> {
    // reportId берём из URL /reports/:id.
    const reportId = readIdFromPath(context.path, '/reports/')
    const report = await this.dependencies.prisma.report.findUnique({ where: { id: reportId } })

    if (!report) {
      throw new NotFoundError()
    }

    // requestedBy может быть BigInt, поэтому для JSON превращаем в number.
    return {
      ...report,
      requestedBy: report.requestedBy ? Number(report.requestedBy) : undefined,
    }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    // DownstreamServiceError несёт реальный статус и тело от booking-service.
    if (error instanceof DownstreamServiceError) {
      sendJson(res, error.responseBody, error.statusCode)
      return
    }

    // Ожидаемые ошибки уже содержат HTTP status code.
    if (error instanceof AnalyticsServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // Неожиданные ошибки логируем подробно.
    this.dependencies.logger.error({
      error,
      message: 'Unhandled analytics-service error',
      service: 'analytics-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

/**
 * Читает тело HTTP-запроса и безопасно парсит JSON.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  // GET-запросы в этом сервисе не используют body.
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  // readJsonBody возвращает и parsed JSON, и исходную строку тела.
  const result = await readJsonBody<unknown>(req)
  return {
    parsedBody: result.parsed,
    rawBody: result.raw,
  }
}
