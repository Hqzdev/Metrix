import { readJsonBody, verifyServiceRequest } from '@metrix/auth'
import type { PrismaClient } from '@prisma/client'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RedisBus } from '@metrix/redis-bus'
import type { AnalyticsServiceConfig } from './config.js'
import { AnalyticsServiceError, AuthenticationError, NotFoundError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import type { AnalyticsServiceLogger } from './logger.js'
import type { BookingClient } from './booking-client.js'
import { calculateStats, calculateSummary } from './analytics-calculations.js'
import { parseCreateReportInput, readIdFromPath } from './report-validation.js'

type AnalyticsRouterDependencies = {
  bookingClient: BookingClient
  bus: RedisBus
  config: AnalyticsServiceConfig
  logger: AnalyticsServiceLogger
  prisma: PrismaClient
}

type RequestContext = {
  method: string
  parsedBody: unknown
  path: string
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
    const url = new URL(req.url ?? '/', `http://localhost:${this.dependencies.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    if (method === 'GET' && path === '/health') {
      return { method, parsedBody: {}, path, requestId: 'health-check' }
    }

    const { parsedBody, rawBody } = await readRequestBody(req, method)
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    const fresh = await this.dependencies.bus.checkReplay(auth.requestId)
    if (!fresh) {
      throw new ReplayAttackError()
    }

    return {
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

    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    if (method === 'GET' && path === '/stats') {
      const bookings = await this.dependencies.bookingClient.listBookings()
      return { body: calculateStats(bookings), statusCode: 200 }
    }

    if (method === 'GET' && path === '/summary') {
      const bookings = await this.dependencies.bookingClient.listBookings()
      return { body: calculateSummary(bookings), statusCode: 200 }
    }

    if (method === 'POST' && path === '/reports') {
      return { body: await this.createReport(context), statusCode: 201 }
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      return { body: await this.getReport(context), statusCode: 200 }
    }

    throw new NotFoundError()
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   */
  private async createReport(context: RequestContext): Promise<unknown> {
    const input = parseCreateReportInput(context.parsedBody)
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
    const reportId = readIdFromPath(context.path, '/reports/')
    const report = await this.dependencies.prisma.report.findUnique({ where: { id: reportId } })

    if (!report) {
      throw new NotFoundError()
    }

    return {
      ...report,
      requestedBy: report.requestedBy ? Number(report.requestedBy) : undefined,
    }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof AnalyticsServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

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
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  const result = await readJsonBody<unknown>(req)
  return {
    parsedBody: result.parsed,
    rawBody: result.raw,
  }
}
