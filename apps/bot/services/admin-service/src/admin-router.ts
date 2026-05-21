import { audit, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { writeAuditLog, type AuditLogInput } from '@metrix/audit-log'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import type { AdminServiceConfig } from './config.js'
import { AdminServiceError, AuthenticationError, NotFoundError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import type { AdminServiceLogger } from './logger.js'
import type { SignedHttpClient } from './signed-http-client.js'
import { parseUpdateLocationInput, parseUpdateResourceInput, readIdFromPath } from './validation.js'

type AdminRouterDependencies = {
  config: AdminServiceConfig
  httpClient: SignedHttpClient
  logger: AdminServiceLogger
  prisma: PrismaClient
  redis: Redis
}

type RequestContext = {
  callerName: string
  method: string
  parsedBody: unknown
  path: string
  query: URLSearchParams
  requestId: string
  traceparent: string
}

/**
 * Обрабатывает HTTP-запросы admin-service.
 *
 * Ответственность:
 * - проверяет service-to-service auth;
 * - отклоняет replay-запросы;
 * - валидирует payload административных изменений;
 * - проксирует привилегированные чтения и записи в downstream-сервисы.
 */
export class AdminRouter {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly dependencies: AdminRouterDependencies) {}

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
      return { callerName: 'health-check', method, parsedBody: {}, path, query: url.searchParams, requestId: 'health-check', traceparent: '' }
    }

    const { parsedBody, rawBody } = await readRequestBody(req, method)
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    const fresh = await this.dependencies.redis.set(`replay:${auth.requestId}`, '1', 'EX', 60, 'NX')
    if (fresh !== 'OK') {
      throw new ReplayAttackError()
    }

    return {
      callerName: auth.callerName,
      method,
      parsedBody,
      path,
      query: url.searchParams,
      requestId: auth.requestId,
      traceparent: auth.traceparent,
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

    if (method === 'GET' && path === '/bookings') {
      return { body: await this.getBookings(), statusCode: 200 }
    }

    if (method === 'GET' && path === '/stats') {
      return { body: await this.getStats(), statusCode: 200 }
    }

    if (method === 'GET' && path === '/summary') {
      return { body: await this.getSummary(), statusCode: 200 }
    }

    if (method === 'GET' && path === '/audit-logs') {
      return { body: await this.getAuditLogs(context), statusCode: 200 }
    }

    if (method === 'PATCH' && path.startsWith('/locations/')) {
      return { body: await this.updateLocation(context), statusCode: 200 }
    }

    if (method === 'PATCH' && path.startsWith('/resources/')) {
      return { body: await this.updateResource(context), statusCode: 200 }
    }

    if (method === 'POST' && path === '/reports') {
      return this.createReport(context)
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      return { body: await this.getReport(context), statusCode: 200 }
    }

    if (method === 'GET' && path === '/dlq') {
      return { body: await this.listDlq(context), statusCode: 200 }
    }

    if (method === 'GET' && path === '/dlq/streams') {
      return { body: await this.listDlqStreams(), statusCode: 200 }
    }

    if (method === 'POST' && path === '/dlq/replay') {
      return { body: await this.replayDlq(context), statusCode: 200 }
    }

    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/compensate')) {
      return this.compensatePaymentSaga(context)
    }

    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/retry-booking')) {
      return this.retryPaymentSagaBooking(context)
    }

    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/mark-compensated')) {
      return this.markPaymentSagaCompensated(context)
    }

    if (method === 'GET' && path === '/payment-sagas') {
      return { body: await this.listPaymentSagas(context), statusCode: 200 }
    }

    if (method === 'GET' && path.startsWith('/payment-sagas/')) {
      return { body: await this.getPaymentSaga(context), statusCode: 200 }
    }

    throw new NotFoundError()
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getBookings(): Promise<unknown> {
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.bookingServiceUrl}/bookings`)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getStats(): Promise<unknown> {
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/stats`)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getSummary(): Promise<unknown> {
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/summary`)
  }

  /**
   * Возвращает persistent audit log с ограниченным набором фильтров.
   */
  private async getAuditLogs(context: RequestContext): Promise<unknown> {
    const limit = parseLimit(context.query.get('limit'))
    const cursor = parseAuditCursor(context.query.get('cursor'))
    const where = buildAuditLogWhere(context.query)
    const rows = await this.dependencies.prisma.auditLog.findMany({
      orderBy: [{ ts: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      where: {
        ...where,
        ...(cursor
          ? {
              OR: [
                { ts: { lt: cursor.ts } },
                { id: { lt: cursor.id }, ts: cursor.ts },
              ],
            }
          : {}),
      },
    })
    const pageRows = rows.slice(0, limit)
    const nextRow = rows.length > limit ? pageRows[pageRows.length - 1] : undefined

    return {
      items: pageRows.map((row) => ({
        action: row.action,
        actorUserId: row.actorUserId === null ? null : row.actorUserId.toString(),
        callerService: row.callerService,
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        payload: row.payload,
        requestId: row.requestId,
        service: row.service,
        ts: row.ts.toISOString(),
      })),
      limit,
      nextCursor: nextRow ? encodeAuditCursor({ id: nextRow.id, ts: nextRow.ts }) : null,
    }
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private async updateLocation(context: RequestContext): Promise<unknown> {
    const locationId = readIdFromPath(context.path, '/locations/')
    const payload = parseUpdateLocationInput(context.parsedBody)
    const result = await this.dependencies.httpClient.patchJson(
      `${this.dependencies.config.bookingServiceUrl}/locations/${locationId}`,
      payload,
    )

    audit({
      action: 'location.updated',
      callerService: context.callerName,
      locationId,
      requestId: context.requestId,
      service: 'admin',
      ts: new Date().toISOString(),
    })
    await this.writeAudit({
      action: 'location.updated',
      callerService: context.callerName,
      entityId: locationId,
      entityType: 'location',
      payload,
      requestId: context.requestId,
      service: 'admin',
    })

    return result
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private async updateResource(context: RequestContext): Promise<unknown> {
    const resourceId = readIdFromPath(context.path, '/resources/')
    const payload = parseUpdateResourceInput(context.parsedBody)
    const result = await this.dependencies.httpClient.patchJson(
      `${this.dependencies.config.bookingServiceUrl}/resources/${resourceId}`,
      payload,
    )

    audit({
      action: 'resource.updated',
      callerService: context.callerName,
      requestId: context.requestId,
      resourceId,
      service: 'admin',
      ts: new Date().toISOString(),
    })
    await this.writeAudit({
      action: 'resource.updated',
      callerService: context.callerName,
      entityId: resourceId,
      entityType: 'resource',
      payload,
      requestId: context.requestId,
      service: 'admin',
    })

    return result
  }

  /**
   * Пишет persistent audit log без влияния на основной бизнес-flow.
   */
  private async writeAudit(input: AuditLogInput): Promise<void> {
    try {
      await writeAuditLog(this.dependencies.prisma, input)
    } catch (error) {
      this.dependencies.logger.error({
        action: 'audit.persist.failed',
        error,
        message: 'Failed to persist audit log',
        service: 'admin-service',
      })
    }
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   */
  private createReport(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    return this.dependencies.httpClient.postJson(`${this.dependencies.config.analyticsServiceUrl}/reports`, context.parsedBody)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getReport(context: RequestContext): Promise<unknown> {
    const reportId = readIdFromPath(context.path, '/reports/')
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/reports/${reportId}`)
  }

  /**
   * Возвращает последние сообщения DLQ stream.
   */
  private async listDlq(context: RequestContext): Promise<unknown> {
    const stream = readRequiredQueryParam(context, 'stream')
    const limit = readLimitQueryParam(context)
    const dlqStream = stream.startsWith('dlq:') ? stream : `dlq:${stream}`
    const rows = (await this.dependencies.redis.xrevrange(dlqStream, '+', '-', 'COUNT', String(limit))) as Array<[string, string[]]>

    return rows.map(([id, fields]) => ({
      id,
      data: readField(fields, 'data'),
      deliveryCount: readField(fields, 'deliveryCount'),
      originalId: readField(fields, 'originalId'),
      originalStream: readField(fields, 'originalStream'),
    }))
  }

  /**
   * Возвращает DLQ streams для operator dashboard.
   */
  private async listDlqStreams(): Promise<unknown> {
    const streams = await scanRedisKeys(this.dependencies.redis, 'dlq:*')
    return {
      items: streams.sort().map((stream) => ({ stream })),
    }
  }

  /**
   * Переотправляет DLQ payload в исходный stream или явно указанный targetStream.
   */
  private async replayDlq(context: RequestContext): Promise<unknown> {
    const body = context.parsedBody as { dlqStream?: unknown; messageId?: unknown; targetStream?: unknown }
    if (typeof body.dlqStream !== 'string' || body.dlqStream.trim() === '') throw new NotFoundError()
    if (typeof body.messageId !== 'string' || body.messageId.trim() === '') throw new NotFoundError()

    const rows = (await this.dependencies.redis.xrange(body.dlqStream, body.messageId, body.messageId)) as Array<[string, string[]]>
    const [, fields] = rows[0] ?? []
    if (!fields) throw new NotFoundError()

    const data = readField(fields, 'data')
    const originalStream = readField(fields, 'originalStream')
    const targetStream = typeof body.targetStream === 'string' && body.targetStream.trim() !== '' ? body.targetStream : originalStream
    if (!data || !targetStream) throw new NotFoundError()

    const replayedId = await this.dependencies.redis.xadd(targetStream, '*', 'data', data)

    await this.writeAudit({
      action: 'dlq.replayed',
      callerService: context.callerName,
      entityId: body.messageId,
      entityType: 'dlq_message',
      payload: {
        dlqStream: body.dlqStream,
        replayedId,
        targetStream,
      },
      requestId: context.requestId,
      service: 'admin',
    })

    return { ok: true, replayedId }
  }

  /**
   * Запускает ручную компенсацию failed payment saga.
   */
  private async compensatePaymentSaga(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/compensate')
    const result = await this.dependencies.httpClient.postJson(
      `${this.dependencies.config.paymentServiceUrl}/sagas/${invoiceId}/compensate`,
      {},
    )
    return { body: result.body, statusCode: 200 }
  }

  /**
   * Возвращает PaymentSaga для ручного recovery.
   */
  private getPaymentSaga(context: RequestContext): Promise<unknown> {
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/')
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.paymentServiceUrl}/sagas/${invoiceId}`)
  }

  /**
   * Возвращает PaymentSaga recovery queue для admin screen.
   */
  private async listPaymentSagas(context: RequestContext): Promise<unknown> {
    const status = context.query.get('status')?.trim()
    const limit = readLimitQueryParam(context)
    const statuses = status && status !== 'recovery'
      ? [status]
      : ['failed', 'compensating', 'awaiting_booking']
    const rows = await this.dependencies.prisma.paymentSaga.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      where: {
        status: { in: statuses },
      },
    })

    return {
      items: rows.map((row) => ({
        bookingId: row.bookingId,
        chatId: row.chatId.toString(),
        createdAt: row.createdAt.toISOString(),
        currentPart: row.currentPart,
        failureReason: row.failureReason,
        invoiceId: row.invoiceId,
        paidAmount: row.paidAmount,
        resourceId: row.resourceId,
        slotId: row.slotId,
        status: row.status,
        telegramUserId: row.telegramUserId.toString(),
        totalAmount: row.totalAmount,
        totalParts: row.totalParts,
        updatedAt: row.updatedAt.toISOString(),
      })),
      limit,
    }
  }

  /**
   * Повторяет создание Booking для failed saga.
   */
  private async retryPaymentSagaBooking(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/retry-booking')
    const result = await this.dependencies.httpClient.postJson(
      `${this.dependencies.config.paymentServiceUrl}/sagas/${invoiceId}/retry-booking`,
      {},
    )
    return { body: result.body, statusCode: 200 }
  }

  /**
   * Помечает ручную компенсацию завершённой.
   */
  private async markPaymentSagaCompensated(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/mark-compensated')
    const result = await this.dependencies.httpClient.postJson(
      `${this.dependencies.config.paymentServiceUrl}/sagas/${invoiceId}/mark-compensated`,
      {},
    )
    return { body: result.body, statusCode: 200 }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof AdminServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    this.dependencies.logger.error({
      error,
      message: 'Unhandled admin-service error',
      service: 'admin-service',
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

function parseLimit(value: string | null): number {
  if (value === null || value.trim() === '') return 50

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return 50

  return Math.min(parsed, 100)
}

type AuditCursor = {
  id: string
  ts: Date
}

function parseAuditCursor(value: string | null): AuditCursor | undefined {
  if (value === null || value.trim() === '') return undefined

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { id?: unknown; ts?: unknown }
    if (typeof parsed.id !== 'string' || typeof parsed.ts !== 'string') return undefined

    const ts = new Date(parsed.ts)
    if (Number.isNaN(ts.getTime())) return undefined

    return { id: parsed.id, ts }
  } catch {
    return undefined
  }
}

function encodeAuditCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify({ id: cursor.id, ts: cursor.ts.toISOString() })).toString('base64url')
}

function readRequiredQueryParam(context: RequestContext, name: string): string {
  const value = context.query.get(name)
  if (value === null || value.trim() === '') throw new NotFoundError()
  return value.trim()
}

function readLimitQueryParam(context: RequestContext): number {
  return parseLimit(context.query.get('limit'))
}

function readField(fields: string[], name: string): string | undefined {
  const index = fields.indexOf(name)
  if (index === -1) return undefined
  return fields[index + 1]
}

async function scanRedisKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = []
  let cursor = '0'

  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
    cursor = nextCursor
    keys.push(...batch)
  } while (cursor !== '0')

  return keys
}

function buildAuditLogWhere(query: URLSearchParams) {
  const where: {
    action?: string
    entityId?: string
    entityType?: string
    requestId?: string
    service?: string
    ts?: {
      gte?: Date
      lte?: Date
    }
  } = {}

  setStringFilter(where, 'action', query.get('action'))
  setStringFilter(where, 'entityId', query.get('entityId'))
  setStringFilter(where, 'entityType', query.get('entityType'))
  setStringFilter(where, 'requestId', query.get('requestId'))
  setStringFilter(where, 'service', query.get('service'))

  const from = parseDateFilter(query.get('from'))
  const to = parseDateFilter(query.get('to'))

  if (from || to) {
    where.ts = {}
    if (from) where.ts.gte = from
    if (to) where.ts.lte = to
  }

  return where
}

type AuditLogStringFilter = 'action' | 'entityId' | 'entityType' | 'requestId' | 'service'

function setStringFilter(target: Partial<Record<AuditLogStringFilter, string>>, key: AuditLogStringFilter, value: string | null): void {
  if (value === null || value.trim() === '') return
  target[key] = value.trim()
}

function parseDateFilter(value: string | null): Date | undefined {
  if (value === null || value.trim() === '') return undefined

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed
}
