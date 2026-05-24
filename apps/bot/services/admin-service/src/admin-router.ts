import { audit, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { listAuditLogs, writeAuditLog, type AuditLogInput } from '@metrix/audit-log'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import type { AdminServiceConfig } from './config.js'
import { AdminServiceError, AuthenticationError, NotFoundError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import type { AdminServiceLogger } from './logger.js'
import type { SignedHttpClient } from './signed-http-client.js'
import { parseUpdateLocationInput, parseUpdateResourceInput, readIdFromPath } from './validation.js'

// Все внешние зависимости router получает снаружи, чтобы его было проще тестировать.
type AdminRouterDependencies = {
  // Настройки URL-ов, портов, секретов и доверенных caller-ов.
  config: AdminServiceConfig
  // HTTP-клиент для безопасных запросов в другие сервисы.
  httpClient: SignedHttpClient
  // Логгер для ошибок и служебных событий.
  logger: AdminServiceLogger
  // Доступ к PostgreSQL через Prisma.
  prisma: PrismaClient
  // Доступ к Redis для replay-защиты и DLQ.
  redis: Redis
}

// Контекст одного HTTP-запроса после первичного разбора и авторизации.
type RequestContext = {
  // Имя сервиса, который подписал входящий запрос.
  callerName: string
  // HTTP-метод: GET, POST, PATCH и так далее.
  method: string
  // Распарсенное JSON-тело запроса.
  parsedBody: unknown
  // URL path без query string.
  path: string
  // Query-параметры, например limit или cursor.
  query: URLSearchParams
  // Уникальный id запроса из service-to-service подписи.
  requestId: string
  // Trace context для распределённой трассировки.
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
      // Сначала приводим сырой HTTP-запрос к удобному внутреннему формату.
      const context = await this.createRequestContext(req)
      // Затем выбираем нужный handler по path и method.
      const result = await this.dispatch(context)
      // В конце отправляем JSON-ответ клиенту.
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      // Любая ошибка превращается в аккуратный HTTP-ответ.
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    // URL строим с localhost как base, потому что IncomingMessage содержит только относительный путь.
    const url = new URL(req.url ?? '/', `http://localhost:${this.dependencies.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // Health-check не требует подписи, чтобы инфраструктура могла проверять сервис просто.
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', method, parsedBody: {}, path, query: url.searchParams, requestId: 'health-check', traceparent: '' }
    }

    // Для подписанных запросов важно иметь и распарсенное тело, и исходную строку тела.
    const { parsedBody, rawBody } = await readRequestBody(req, method)
    // Проверяем подпись, request id, caller name и trace headers.
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    // NX означает "запиши только если ключа ещё нет"; так ловим повтор того же requestId.
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

    // Простая проверка живости процесса.
    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    // Список бронирований берём из booking-service.
    if (method === 'GET' && path === '/bookings') {
      return { body: await this.getBookings(), statusCode: 200 }
    }

    // Агрегированную статистику берём из analytics-service.
    if (method === 'GET' && path === '/stats') {
      return { body: await this.getStats(), statusCode: 200 }
    }

    // Краткую сводку для dashboard тоже отдаёт analytics-service.
    if (method === 'GET' && path === '/summary') {
      return { body: await this.getSummary(), statusCode: 200 }
    }

    // Audit logs читает общий пакет, admin-service только отдаёт HTTP-представление.
    if (method === 'GET' && path === '/audit-logs') {
      return { body: await this.getAuditLogs(context), statusCode: 200 }
    }

    // PATCH /locations/:id обновляет только разрешённые поля локации.
    if (method === 'PATCH' && path.startsWith('/locations/')) {
      return { body: await this.updateLocation(context), statusCode: 200 }
    }

    // PATCH /resources/:id обновляет только разрешённые поля ресурса.
    if (method === 'PATCH' && path.startsWith('/resources/')) {
      return { body: await this.updateResource(context), statusCode: 200 }
    }

    // POST /reports просит analytics-service создать отчёт.
    if (method === 'POST' && path === '/reports') {
      return this.createReport(context)
    }

    // GET /reports/:id забирает готовый отчёт из analytics-service.
    if (method === 'GET' && path.startsWith('/reports/')) {
      return { body: await this.getReport(context), statusCode: 200 }
    }

    // DLQ endpoint показывает сообщения из конкретного dead-letter stream.
    if (method === 'GET' && path === '/dlq') {
      return { body: await this.listDlq(context), statusCode: 200 }
    }

    // Этот endpoint возвращает список всех DLQ stream-ов в Redis.
    if (method === 'GET' && path === '/dlq/streams') {
      return { body: await this.listDlqStreams(), statusCode: 200 }
    }

    // Replay возвращает сообщение из DLQ обратно в рабочий stream.
    if (method === 'POST' && path === '/dlq/replay') {
      return { body: await this.replayDlq(context), statusCode: 200 }
    }

    // Ручная компенсация payment saga.
    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/compensate')) {
      return this.compensatePaymentSaga(context)
    }

    // Повтор шага создания booking для payment saga.
    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/retry-booking')) {
      return this.retryPaymentSagaBooking(context)
    }

    // Ручная отметка, что компенсация payment saga завершена.
    if (method === 'POST' && path.startsWith('/payment-sagas/') && path.endsWith('/mark-compensated')) {
      return this.markPaymentSagaCompensated(context)
    }

    // Очередь payment saga, которые требуют внимания оператора.
    if (method === 'GET' && path === '/payment-sagas') {
      return { body: await this.listPaymentSagas(context), statusCode: 200 }
    }

    // Детальная информация по одной payment saga.
    if (method === 'GET' && path.startsWith('/payment-sagas/')) {
      return { body: await this.getPaymentSaga(context), statusCode: 200 }
    }

    // Если ни один route не подошёл, отвечаем 404.
    throw new NotFoundError()
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getBookings(): Promise<unknown> {
    // Admin-service не хранит бронирования сам, а проксирует запрос в booking-service.
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.bookingServiceUrl}/bookings`)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getStats(): Promise<unknown> {
    // Статистика считается в analytics-service.
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/stats`)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getSummary(): Promise<unknown> {
    // Summary — короткая версия аналитики для интерфейса администратора.
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/summary`)
  }

  /**
   * Возвращает persistent audit log с ограниченным набором фильтров.
   */
  private async getAuditLogs(context: RequestContext): Promise<unknown> {
    // listAuditLogs владеет pagination internals: parseAuditCursor и nextCursor.
    return listAuditLogs(this.dependencies.prisma, context.query)
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private async updateLocation(context: RequestContext): Promise<unknown> {
    // id берём из URL вида /locations/:id.
    const locationId = readIdFromPath(context.path, '/locations/')
    // Тело запроса фильтруем, чтобы наружу не ушли лишние поля.
    const payload = parseUpdateLocationInput(context.parsedBody)
    // Само изменение выполняет booking-service.
    const result = await this.dependencies.httpClient.patchJson(
      `${this.dependencies.config.bookingServiceUrl}/locations/${locationId}`,
      payload,
    )

    // Быстрый audit event для общей системы аудита.
    audit({
      action: 'location.updated',
      callerService: context.callerName,
      locationId,
      requestId: context.requestId,
      service: 'admin',
      ts: new Date().toISOString(),
    })
    // Persistent audit log сохраняем в PostgreSQL для dashboard и расследований.
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
    // id берём из URL вида /resources/:id.
    const resourceId = readIdFromPath(context.path, '/resources/')
    // Валидируем и оставляем только разрешённые поля ресурса.
    const payload = parseUpdateResourceInput(context.parsedBody)
    // Передаём изменение в booking-service, где хранится ресурс.
    const result = await this.dependencies.httpClient.patchJson(
      `${this.dependencies.config.bookingServiceUrl}/resources/${resourceId}`,
      payload,
    )

    // Пишем audit event о том, кто и что поменял.
    audit({
      action: 'resource.updated',
      callerService: context.callerName,
      requestId: context.requestId,
      resourceId,
      service: 'admin',
      ts: new Date().toISOString(),
    })
    // Дублируем событие в persistent audit log.
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
      // Сохраняем audit log в базе.
      await writeAuditLog(this.dependencies.prisma, input)
    } catch (error) {
      // Ошибка audit log не должна ломать основное действие администратора.
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
    // Тело запроса передаём как есть: контракт отчёта проверяет analytics-service.
    return this.dependencies.httpClient.postJson(`${this.dependencies.config.analyticsServiceUrl}/reports`, context.parsedBody)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private getReport(context: RequestContext): Promise<unknown> {
    // reportId берём из URL /reports/:id.
    const reportId = readIdFromPath(context.path, '/reports/')
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.analyticsServiceUrl}/reports/${reportId}`)
  }

  /**
   * Возвращает последние сообщения DLQ stream.
   */
  private async listDlq(context: RequestContext): Promise<unknown> {
    // stream обязателен, потому что DLQ может быть несколько.
    const stream = readRequiredQueryParam(context, 'stream')
    // limit защищает Redis и UI от слишком больших ответов.
    const limit = readLimitQueryParam(context)
    // Разрешаем передавать stream как с prefix dlq:, так и без него.
    const dlqStream = stream.startsWith('dlq:') ? stream : `dlq:${stream}`
    // xrevrange читает последние сообщения stream-а от новых к старым.
    const rows = (await this.dependencies.redis.xrevrange(dlqStream, '+', '-', 'COUNT', String(limit))) as Array<[string, string[]]>

    // Redis stream хранит поля плоским массивом, поэтому собираем объект вручную.
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
    // SCAN безопаснее KEYS, потому что не блокирует Redis надолго.
    const streams = await scanRedisKeys(this.dependencies.redis, 'dlq:*')
    return {
      items: streams.sort().map((stream) => ({ stream })),
    }
  }

  /**
   * Переотправляет DLQ payload в исходный stream или явно указанный targetStream.
   */
  private async replayDlq(context: RequestContext): Promise<unknown> {
    // Для replay нужен stream DLQ и id конкретного сообщения.
    const body = context.parsedBody as { dlqStream?: unknown; messageId?: unknown; targetStream?: unknown }
    if (typeof body.dlqStream !== 'string' || body.dlqStream.trim() === '') throw new NotFoundError()
    if (typeof body.messageId !== 'string' || body.messageId.trim() === '') throw new NotFoundError()

    // Ищем ровно одно сообщение по id.
    const rows = (await this.dependencies.redis.xrange(body.dlqStream, body.messageId, body.messageId)) as Array<[string, string[]]>
    const [, fields] = rows[0] ?? []
    if (!fields) throw new NotFoundError()

    // data — исходная полезная нагрузка, originalStream — куда её вернуть.
    const data = readField(fields, 'data')
    const originalStream = readField(fields, 'originalStream')
    // targetStream можно явно переопределить, иначе используем originalStream.
    const targetStream = typeof body.targetStream === 'string' && body.targetStream.trim() !== '' ? body.targetStream : originalStream
    if (!data || !targetStream) throw new NotFoundError()

    // Возвращаем payload обратно в рабочий Redis stream.
    const replayedId = await this.dependencies.redis.xadd(targetStream, '*', 'data', data)

    // Фиксируем ручной replay в audit log.
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
    // invoiceId является id saga в payment-service.
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/compensate')
    // Компенсацию выполняет payment-service, admin-service только запускает действие.
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
    // invoiceId берём из URL /payment-sagas/:invoiceId.
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/')
    return this.dependencies.httpClient.getJson(`${this.dependencies.config.paymentServiceUrl}/sagas/${invoiceId}`)
  }

  /**
   * Возвращает PaymentSaga recovery queue для admin screen.
   */
  private async listPaymentSagas(context: RequestContext): Promise<unknown> {
    // status=recovery означает стандартный набор проблемных статусов.
    const status = context.query.get('status')?.trim()
    const limit = readLimitQueryParam(context)
    // Если статус не указан или recovery, показываем всё, что требует ручного внимания.
    const statuses = status && status !== 'recovery'
      ? [status]
      : ['failed', 'compensating', 'awaiting_booking']
    // Payment saga лежит в общей базе, поэтому читаем её через Prisma.
    const rows = await this.dependencies.prisma.paymentSaga.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      where: {
        status: { in: statuses },
      },
    })

    return {
      // BigInt поля превращаем в строки, чтобы JSON.stringify не упал.
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
    // invoiceId показывает, какую saga нужно повторить.
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/retry-booking')
    // Повтор booking-шагов делает payment-service.
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
    // invoiceId показывает, какую saga оператор уже компенсировал вручную.
    const invoiceId = readIdFromPath(context.path, '/payment-sagas/', '/mark-compensated')
    // Фактическое изменение статуса делает payment-service.
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
    // Ожидаемые доменные ошибки уже содержат правильный HTTP-код.
    if (error instanceof AdminServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // Неожиданные ошибки логируем подробно, а клиенту отдаём нейтральное сообщение.
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
  // GET-запросы в этом сервисе не используют body.
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  // readJsonBody возвращает и parsed JSON, и raw строку для проверки подписи.
  const result = await readJsonBody<unknown>(req)
  return {
    parsedBody: result.parsed,
    rawBody: result.raw,
  }
}

/**
 * Читает limit из query и ограничивает его безопасным максимумом.
 */
function parseLimit(value: string | null): number {
  // Если limit не передали, используем стандартную страницу на 50 элементов.
  if (value === null || value.trim() === '') return 50

  const parsed = Number(value)
  // Невалидный limit не роняет запрос, а возвращает дефолт.
  if (!Number.isInteger(parsed) || parsed < 1) return 50

  // Больше 100 за раз не отдаём, чтобы не перегружать сервис и UI.
  return Math.min(parsed, 100)
}

/**
 * Читает обязательный query-параметр.
 */
function readRequiredQueryParam(context: RequestContext, name: string): string {
  // Пустая строка считается отсутствующим значением.
  const value = context.query.get(name)
  if (value === null || value.trim() === '') throw new NotFoundError()
  return value.trim()
}

/**
 * Общий helper для limit query-параметра.
 */
function readLimitQueryParam(context: RequestContext): number {
  return parseLimit(context.query.get('limit'))
}

/**
 * Достаёт одно поле из плоского массива Redis stream fields.
 */
function readField(fields: string[], name: string): string | undefined {
  // Redis возвращает поля как ['key1', 'value1', 'key2', 'value2'].
  const index = fields.indexOf(name)
  if (index === -1) return undefined
  // Значение всегда лежит сразу после имени поля.
  return fields[index + 1]
}

/**
 * Ищет ключи Redis через SCAN по частям.
 */
async function scanRedisKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = []
  // Redis cursor '0' означает старт, а потом и конец обхода.
  let cursor = '0'

  do {
    // COUNT — подсказка Redis, сколько ключей примерно вернуть за один шаг.
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
    cursor = nextCursor
    keys.push(...batch)
  } while (cursor !== '0')

  return keys
}
