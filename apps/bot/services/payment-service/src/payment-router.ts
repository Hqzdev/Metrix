import { randomUUID } from 'node:crypto'
import { audit, extractUserId, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { writeAuditLog, type AuditLogInput } from '@metrix/audit-log'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { isLikelyYooKassaApiKey, type PaymentServiceConfig } from './config.js'
import { AuthenticationError, ConflictError, DownstreamServiceError, NotFoundError, PaymentConfigurationError, PaymentServiceError, ReplayAttackError } from './errors.js'
import { sendJson } from './http-response.js'
import type { PaymentServiceLogger } from './logger.js'
import type { BookingServiceClient } from './booking-service-client.js'
import { parseCreateInvoiceInput, parsePreCheckoutQuery, parseSuccessfulPaymentMessage, readIdFromPath } from './validation.js'

// Telegram Stars ограничивает сумму одного инвойса значением 9 999 999 минимальных единиц.
// Суммы выше разбиваются на последовательные инвойсы.
const TELEGRAM_MAX_INVOICE_MINOR_UNITS = 9_900_000
// Hold держит слот за пользователем 10 минут, пока он оплачивает invoice.
const SLOT_HOLD_TTL_MS = 10 * 60 * 1000

// Зависимости PaymentRouter.
type PaymentRouterDependencies = {
  // Клиент booking-service.
  bookingClient: BookingServiceClient
  // RedisBus для публикации событий.
  bus: RedisBus
  // Runtime-конфиг.
  config: PaymentServiceConfig
  // JSON-логгер.
  logger: PaymentServiceLogger
  // Prisma для invoices, holds и sagas.
  prisma: PrismaClient
}

// Контекст одного HTTP-запроса после auth и парсинга.
type RequestContext = {
  // Имя caller-сервиса.
  callerName: string
  // Telegram user id из подписанного заголовка.
  callerUserId: number | undefined
  // HTTP-метод.
  method: string
  // JSON body.
  parsedBody: unknown
  // URL path.
  path: string
  // requestId для audit/replay.
  requestId: string
}

/**
 * Обрабатывает HTTP-запросы payment-service.
 *
 * Ответственность:
 * - создаёт инвойсы и публикует их в Telegram через notification-service;
 * - проверяет pre-checkout query перед подтверждением оплаты;
 * - обрабатывает successful_payment и публикует событие PAYMENT_COMPLETED.
 */
export class PaymentRouter {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly deps: PaymentRouterDependencies) {}

  /**
   * Обрабатывает входящий HTTP-запрос и отправляет результат или ошибку.
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Проверяем auth и собираем request context.
      const context = await this.createRequestContext(req)
      // Выбираем нужный handler.
      const result = await this.dispatch(context)
      // Отдаём JSON-ответ.
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      // Ошибки тоже переводим в HTTP.
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    // IncomingMessage содержит относительный URL.
    const url = new URL(req.url ?? '/', `http://localhost:${this.deps.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // Health доступен без подписи.
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', callerUserId: undefined, method, parsedBody: {}, path, requestId: 'health-check' }
    }

    // rawBody нужен для подписи, parsedBody — для логики.
    const { parsedBody, rawBody } = await readRequestBody(req, method)
    // Проверяем service-to-service подпись.
    const auth = verifyServiceRequest(req, rawBody, this.deps.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    // Replay-защита requestId.
    const fresh = await this.deps.bus.checkReplay(auth.requestId)
    if (!fresh) {
      throw new ReplayAttackError()
    }

    // Достаём подписанный user id, если он есть.
    const callerUserId = this.extractCallerUserId(req)

    return {
      callerName: auth.callerName,
      callerUserId,
      method,
      parsedBody,
      path,
      requestId: auth.requestId,
    }
  }

  /**
   * Извлекает проверенный Telegram user id из доверенных заголовков.
   */
  private extractCallerUserId(req: IncomingMessage): number | undefined {
    // Без секрета user id не доверяем.
    if (!this.deps.config.userIdSigningSecret) return undefined

    try {
      // extractUserId проверяет подпись заголовка.
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

    // Проверка живости.
    if (method === 'GET' && path === '/health') {
      return { body: { ok: true }, statusCode: 200 }
    }

    // Создать invoice и hold слота.
    if (method === 'POST' && path === '/invoices') {
      return { body: await this.createInvoice(context), statusCode: 201 }
    }

    // Telegram спрашивает перед списанием, можно ли принимать оплату.
    if (method === 'POST' && path === '/pre-checkout') {
      return { body: await this.handlePreCheckout(context), statusCode: 200 }
    }

    // Telegram сообщил, что оплата прошла успешно.
    if (method === 'POST' && path === '/successful-payment') {
      return { body: await this.handleSuccessfulPayment(context), statusCode: 200 }
    }

    // Ручной запуск компенсации failed saga.
    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/compensate')) {
      return { body: await this.compensateSaga(context), statusCode: 200 }
    }

    // Повторить создание booking после успешной оплаты.
    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/retry-booking')) {
      return { body: await this.retrySagaBooking(context), statusCode: 200 }
    }

    // Отметить ручную компенсацию завершённой.
    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/mark-compensated')) {
      return { body: await this.markSagaCompensated(context), statusCode: 200 }
    }

    // Получить saga для админки.
    if (method === 'GET' && path.startsWith('/sagas/')) {
      return { body: await this.getSaga(context), statusCode: 200 }
    }

    // Остальные маршруты не поддерживаются.
    throw new NotFoundError()
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   */
  private async createInvoice(context: RequestContext): Promise<{ ok: boolean; invoiceId: string }> {
    // Provider token проверяем до создания hold/saga, чтобы не оставить неоплачиваемый invoice.
    this.assertProviderTokenConfigured()
    // invoice создаётся для конкретного пользователя, чата, ресурса и слота.
    const input = parseCreateInvoiceInput(context.parsedBody, context.callerUserId)

    // Сначала проверяем ресурс в booking-service.
    const resource = await this.deps.bookingClient.getResource(input.resourceId)
    if (!resource) {
      throw new NotFoundError('resource not found')
    }

    // Затем проверяем, что слот ещё доступен.
    const slotAvailable = await this.deps.bookingClient.isSlotAvailable(input.resourceId, input.slotId)
    if (!slotAvailable) {
      throw new ConflictError('slot is already booked')
    }

    // total — полная цена брони.
    const total = resource.priceMinorUnits
    // Первый invoice может быть меньше total, если сумма слишком большая для Telegram.
    const firstAmount = Math.min(TELEGRAM_MAX_INVOICE_MINOR_UNITS, total)
    // totalParts показывает, на сколько invoice-ов разбить оплату.
    const totalParts = Math.ceil(total / TELEGRAM_MAX_INVOICE_MINOR_UNITS)
    const invoiceId = randomUUID()
    // До expiresAt слот считается held.
    const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS)

    try {
      // В транзакции создаём hold, invoice и saga.
      await this.deps.prisma.$transaction(async (tx) => {
        // Старые истёкшие holds по этому слоту сразу помечаем expired.
        await tx.slotHold.updateMany({
          data: { status: 'expired' },
          where: {
            resourceId: input.resourceId,
            slotId: input.slotId,
            status: 'held',
            expiresAt: { lt: new Date() },
          },
        })

        // Hold временно резервирует слот до оплаты.
        const hold = await tx.slotHold.create({
          data: {
            expiresAt,
            resourceId: input.resourceId,
            slotId: input.slotId,
            telegramUserId: BigInt(input.telegramUserId),
          },
        })

        // PendingInvoice хранит ожидаемый платёж Telegram.
        await tx.pendingInvoice.create({
          data: {
            id: invoiceId,
            amountMinorUnits: firstAmount,
            holdId: hold.id,
            locationId: resource.locationId,
            paidAmountMinorUnits: 0,
            partNumber: 1,
            resourceId: input.resourceId,
            slotId: input.slotId,
            status: 'pending',
            telegramUserId: BigInt(input.telegramUserId),
            totalAmountMinorUnits: total,
            totalParts,
          },
        })

        // Связываем hold с invoiceId.
        await tx.slotHold.update({
          data: { invoiceId },
          where: { id: hold.id },
        })

        // PaymentSaga отслеживает весь сценарий: invoice -> payment -> booking.
        await tx.paymentSaga.create({
          data: {
            chatId: BigInt(input.chatId),
            currentPart: 1,
            invoiceId,
            paidAmount: 0,
            resourceId: input.resourceId,
            slotId: input.slotId,
            status: 'pending',
            telegramUserId: BigInt(input.telegramUserId),
            totalAmount: total,
            totalParts,
          },
        })

      })
    } catch (error) {
      // Unique constraint обычно означает, что слот уже held/booked.
      if (isUniqueConstraintError(error)) {
        throw new ConflictError('slot is already held or booked')
      }
      throw error
    }

    // Persistent audit не должен откатывать платёжную транзакцию при сбое audit table.
    await this.writeAudit({
      action: 'invoice.created',
      actorUserId: input.telegramUserId,
      entityId: invoiceId,
      entityType: 'invoice',
      payload: {
        resourceId: input.resourceId,
        slotId: input.slotId,
        totalAmountMinorUnits: total,
      },
      requestId: context.requestId,
      service: 'payment',
    })

    // Просим notification-service отправить invoice в Telegram.
    await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_invoice',
      chatId: input.chatId,
      invoiceId,
      title: `Booking: ${resource.name}`,
      description: `${resource.name} — ${resource.priceLabel}`,
      payload: invoiceId,
      providerToken: this.deps.config.providerToken,
      currency: this.deps.config.currency,
      amount: firstAmount,
    })

    // Быстрый audit event.
    audit({
      ts: new Date().toISOString(),
      service: 'payment',
      action: 'invoice.created',
      userId: input.telegramUserId,
      invoiceId,
      resourceId: input.resourceId,
      requestId: context.requestId,
    })
    return { ok: true, invoiceId }
  }

  /**
   * Выполняет шаг handlePreCheckout внутри сервисного сценария.
   */
  private async handlePreCheckout(context: RequestContext): Promise<{ ok: boolean; errorMessage?: string }> {
    // Telegram присылает pre_checkout_query перед финальным подтверждением оплаты.
    const query = parsePreCheckoutQuery(context.parsedBody)

    if (!query) {
      return { ok: false, errorMessage: 'missing query' }
    }

    // Ищем invoice по payload.
    const invoice = await this.deps.prisma.pendingInvoice.findUnique({ where: { id: query.invoice_payload } })

    // Проверяем, что invoice принадлежит этому пользователю и ещё pending.
    if (!invoice || Number(invoice.telegramUserId) !== query.from.id || invoice.status !== 'pending') {
      return { ok: false, errorMessage: 'Invoice not found for your account.' }
    }

    // Валюта и сумма должны совпасть с тем, что мы создали.
    if (query.currency !== this.deps.config.currency || query.total_amount !== invoice.amountMinorUnits) {
      return { ok: false, errorMessage: 'Payment amount mismatch.' }
    }

    // Hold должен быть живым на момент pre-checkout.
    const hold = await this.deps.prisma.slotHold.findFirst({ where: { invoiceId: invoice.id } })
    if (!hold || hold.status !== 'held' || hold.expiresAt <= new Date()) {
      if (hold?.status === 'held') {
        await this.deps.prisma.slotHold.update({ data: { status: 'expired' }, where: { id: hold.id } })
      }
      return { ok: false, errorMessage: 'Booking hold expired. Create a new invoice.' }
    }

    return { ok: true }
  }

  /**
   * Выполняет шаг handleSuccessfulPayment внутри сервисного сценария.
   */
  private async handleSuccessfulPayment(context: RequestContext): Promise<{ ok: boolean }> {
    // Telegram присылает message.successful_payment после успешной оплаты.
    const msg = parseSuccessfulPaymentMessage(context.parsedBody)

    if (!msg) {
      return { ok: false }
    }

    // payload — это invoiceId.
    const payload = msg.successful_payment.invoice_payload
    const invoice = await this.deps.prisma.pendingInvoice.findUnique({ where: { id: payload } })

    // Если invoice не найден, проверяем saga: возможно событие пришло повторно.
    if (!invoice || !msg.from || Number(invoice.telegramUserId) !== msg.from.id) {
      const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId: payload } })
      if (saga && msg.from && Number(saga.telegramUserId) === msg.from.id && ['awaiting_booking', 'completed'].includes(saga.status)) {
        return { ok: true }
      }

      // Платёж подтверждён Telegram, но инвойс не найден — нужна ручная проверка.
      await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_message',
        chatId: msg.chat.id,
        text: 'Payment received, but booking could not be matched. Contact support.',
      })
      return { ok: false }
    }

    // Повторный webhook по уже обработанному invoice считаем успешным.
    if (invoice.status !== 'pending') {
      return { ok: invoice.status === 'completed' || invoice.status === 'paid_part' }
    }

    // Сумма paid учитывает уже оплаченные части и текущую часть.
    const paid = Number(invoice.paidAmountMinorUnits) + Number(invoice.amountMinorUnits)
    const hold = await this.deps.prisma.slotHold.findFirst({ where: { invoiceId: invoice.id } })

    // Если hold истёк после оплаты, переводим saga в failed и уведомляем пользователя.
    if (!hold || hold.status !== 'held' || hold.expiresAt <= new Date()) {
      await this.deps.prisma.$transaction(async (tx) => {
        if (hold?.status === 'held') {
          await tx.slotHold.update({ data: { status: 'expired' }, where: { id: hold.id } })
        }
        await tx.pendingInvoice.update({
          data: { status: 'expired' },
          where: { id: invoice.id },
        })
        await tx.paymentSaga.updateMany({
          data: { failureReason: 'payment received after hold expired', status: 'failed' },
          where: { invoiceId: invoice.id },
        })
      })
      await this.writeAudit({
        action: 'payment.hold_expired',
        actorUserId: Number(invoice.telegramUserId),
        entityId: invoice.id,
        entityType: 'invoice',
        payload: {
          resourceId: invoice.resourceId,
          slotId: invoice.slotId,
        },
        requestId: context.requestId,
        service: 'payment',
      })
      await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_message',
        chatId: msg.chat.id,
        text: 'Payment received, but the booking hold expired. Contact support.',
      })
      return { ok: false }
    }

    // Если сумма ещё не закрыта, выпускаем следующий invoice.
    if (paid < Number(invoice.totalAmountMinorUnits)) {
      return this.issueNextInvoicePart(msg.chat.id, invoice, paid)
    }

    // Полная оплата завершена: публикуем событие для создания booking.
    await this.deps.bus.publish(STREAMS.PAYMENT_COMPLETED, {
      telegramUserId: Number(invoice.telegramUserId),
      chatId: msg.chat.id,
      resourceId: invoice.resourceId,
      slotId: invoice.slotId,
      totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
      invoiceId: payload,
    })

    // Обновляем invoice и saga в базе.
    audit({ ts: new Date().toISOString(), service: 'payment', action: 'payment.completed', userId: Number(invoice.telegramUserId), invoiceId: payload })
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.updateMany({
        data: { paidAmount: paid, status: 'awaiting_booking' },
        where: { invoiceId: payload },
      })
      await tx.pendingInvoice.update({
        data: { completedAt: new Date(), paidAmountMinorUnits: paid, status: 'completed' },
        where: { id: payload },
      })
    })
    await this.writeAudit({
      action: 'payment.completed',
      actorUserId: Number(invoice.telegramUserId),
      entityId: payload,
      entityType: 'invoice',
      payload: {
        resourceId: invoice.resourceId,
        slotId: invoice.slotId,
        totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
      },
      requestId: context.requestId,
      service: 'payment',
    })

    return { ok: true }
  }

  private async issueNextInvoicePart(
    chatId: number,
    invoice: { id: string; partNumber: number; totalParts: number; totalAmountMinorUnits: number; [key: string]: unknown },
    paid: number,
  ): Promise<{ ok: boolean }> {
    // Остаток суммы снова ограничиваем Telegram maximum.
    const nextAmount = Math.min(TELEGRAM_MAX_INVOICE_MINOR_UNITS, Number(invoice.totalAmountMinorUnits) - paid)
    const nextId = randomUUID()
    // Следующая часть оплаты.
    const nextPartNumber = Number(invoice.partNumber) + 1
    // Продлеваем hold, чтобы пользователь успел оплатить следующую часть.
    const nextExpiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS)

    await this.deps.prisma.$transaction(async (tx) => {
      // Старый invoice помечаем как частично оплаченный.
      await tx.pendingInvoice.update({
        data: { paidAmountMinorUnits: paid, status: 'paid_part', supersededByInvoiceId: nextId },
        where: { id: invoice.id },
      })
      // Создаём новый invoice на остаток.
      await tx.pendingInvoice.create({
        data: {
          amountMinorUnits: nextAmount,
          holdId: typeof invoice.holdId === 'string' ? invoice.holdId : null,
          id: nextId,
          locationId: invoice.locationId as string,
          paidAmountMinorUnits: paid,
          partNumber: nextPartNumber,
          resourceId: invoice.resourceId as string,
          slotId: invoice.slotId as string,
          status: 'pending',
          telegramUserId: invoice.telegramUserId as bigint,
          totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
          totalParts: Number(invoice.totalParts),
        },
      })
      // Hold теперь связан с новым invoice.
      await tx.slotHold.updateMany({
        data: { expiresAt: nextExpiresAt, invoiceId: nextId },
        where: { invoiceId: invoice.id },
      })
      // Saga переходит в ожидание следующей части.
      await tx.paymentSaga.updateMany({
        data: { currentPart: nextPartNumber, invoiceId: nextId, paidAmount: paid, status: 'awaiting_next_part' },
        where: { invoiceId: invoice.id },
      })
    })
    // Audit показывает цепочку invoice parts.
    await this.writeAudit({
      action: 'payment.part_completed',
      actorUserId: Number(invoice.telegramUserId),
      entityId: invoice.id,
      entityType: 'invoice',
      payload: {
        nextInvoiceId: nextId,
        paidAmountMinorUnits: paid,
        partNumber: invoice.partNumber,
        totalParts: invoice.totalParts,
      },
      service: 'payment',
    })

    // Отправляем следующий invoice пользователю.
    await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_invoice',
      chatId,
      invoiceId: nextId,
      title: `Booking: part ${nextPartNumber}/${invoice.totalParts}`,
      description: 'Next payment',
      payload: nextId,
      providerToken: this.deps.config.providerToken,
      currency: this.deps.config.currency,
      amount: nextAmount,
    })

    return { ok: true }
  }

  /**
   * Переводит failed saga в compensating и освобождает hold.
   *
   * Это ручной recovery action: refund выполняется вне системы платежей,
   * но состояние фиксируется, чтобы слот не оставался held.
   */
  private async compensateSaga(context: RequestContext): Promise<{ ok: boolean }> {
    // invoiceId берём из URL /sagas/:invoiceId/compensate.
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/compensate')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (saga.status !== 'failed') throw new ConflictError('only failed saga can be compensated')

    // В транзакции переводим saga и связанные записи в recovery-состояние.
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.update({
        data: { status: 'compensating' },
        where: { invoiceId },
      })
      await tx.slotHold.updateMany({
        data: { status: 'cancelled' },
        where: { invoiceId, status: 'held' },
      })
      await tx.pendingInvoice.updateMany({
        data: { status: 'failed' },
        where: { id: invoiceId },
      })
    })
    await this.writeAudit({
      action: 'payment.compensation_started',
      actorUserId: Number(saga.telegramUserId),
      callerService: context.callerName,
      entityId: invoiceId,
      entityType: 'payment_saga',
      payload: {
        failureReason: saga.failureReason,
        resourceId: saga.resourceId,
        slotId: saga.slotId,
      },
      requestId: context.requestId,
      service: 'payment',
    })

    // Уведомляем пользователя, что вопрос ушёл на ручную проверку.
    await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_message',
      chatId: Number(saga.chatId),
      text: 'Payment is under manual review. Support will contact you about compensation.',
    })

    return { ok: true }
  }

  /**
   * Возвращает PaymentSaga для admin recovery.
   */
  private async getSaga(context: RequestContext): Promise<unknown> {
    // invoiceId берём из URL /sagas/:invoiceId.
    const invoiceId = readIdFromPath(context.path, '/sagas/', '')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')

    // BigInt поля превращаем в строки для JSON.
    return {
      ...saga,
      chatId: saga.chatId.toString(),
      telegramUserId: saga.telegramUserId.toString(),
    }
  }

  /**
   * Повторно публикует PAYMENT_COMPLETED для failed или awaiting_booking saga.
   */
  private async retrySagaBooking(context: RequestContext): Promise<{ ok: boolean }> {
    // invoiceId берём из URL /sagas/:invoiceId/retry-booking.
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/retry-booking')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (!['failed', 'awaiting_booking'].includes(saga.status)) {
      throw new ConflictError('only failed or awaiting_booking saga can retry booking creation')
    }

    // Сначала возвращаем saga в awaiting_booking.
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.update({
        data: { failureReason: null, status: 'awaiting_booking' },
        where: { invoiceId },
      })
    })
    await this.writeAudit({
      action: 'payment.booking_retry_requested',
      actorUserId: Number(saga.telegramUserId),
      callerService: context.callerName,
      entityId: invoiceId,
      entityType: 'payment_saga',
      payload: {
        resourceId: saga.resourceId,
        slotId: saga.slotId,
      },
      requestId: context.requestId,
      service: 'payment',
    })

    // Затем повторно публикуем PAYMENT_COMPLETED, чтобы consumer создал booking.
    await this.deps.bus.publish(STREAMS.PAYMENT_COMPLETED, {
      chatId: Number(saga.chatId),
      invoiceId,
      resourceId: saga.resourceId,
      slotId: saga.slotId,
      telegramUserId: Number(saga.telegramUserId),
      totalAmountMinorUnits: saga.totalAmount,
    })

    return { ok: true }
  }

  /**
   * Завершает ручную компенсацию после внешнего refund/manual action.
   */
  private async markSagaCompensated(context: RequestContext): Promise<{ ok: boolean }> {
    // invoiceId берём из URL /sagas/:invoiceId/mark-compensated.
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/mark-compensated')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (saga.status !== 'compensating') throw new ConflictError('only compensating saga can be marked compensated')

    // Отмечаем, что ручная компенсация завершена вне системы.
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.update({
        data: { status: 'compensated' },
        where: { invoiceId },
      })
    })
    await this.writeAudit({
      action: 'payment.compensated',
      actorUserId: Number(saga.telegramUserId),
      callerService: context.callerName,
      entityId: invoiceId,
      entityType: 'payment_saga',
      payload: {
        resourceId: saga.resourceId,
        slotId: saga.slotId,
      },
      requestId: context.requestId,
      service: 'payment',
    })

    return { ok: true }
  }

  /**
   * Проверяет, что Telegram provider token пригоден до создания invoice.
   */
  private assertProviderTokenConfigured(): void {
    if (!this.deps.config.providerToken) {
      throw new PaymentConfigurationError('Telegram payment provider token is not configured')
    }

    if (isLikelyYooKassaApiKey(this.deps.config.providerToken)) {
      throw new PaymentConfigurationError('Telegram payment provider token has invalid shape')
    }
  }

  /**
   * Пишет persistent audit log без отката бизнес-транзакции при ошибке audit subsystem.
   */
  private async writeAudit(input: AuditLogInput): Promise<void> {
    try {
      await writeAuditLog(this.deps.prisma, input)
    } catch (error) {
      this.deps.logger.error({
        action: 'audit.write.failed',
        entityId: input.entityId,
        entityType: input.entityType,
        error,
        message: 'Failed to write payment audit log',
        requestId: input.requestId,
        service: 'payment-service',
      })
    }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    // DownstreamServiceError несёт реальный статус и тело ответа booking-service.
    if (error instanceof DownstreamServiceError) {
      sendJson(res, error.responseBody, error.statusCode)
      return
    }

    // Доменные ошибки уже знают свой HTTP status code.
    if (error instanceof PaymentServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // Неожиданные ошибки логируем подробно.
    this.deps.logger.error({
      error,
      message: 'Unhandled payment-service error',
      service: 'payment-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }

}

/**
 * Проверяет Prisma unique constraint error.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002'
}

/**
 * Читает тело HTTP-запроса и безопасно парсит JSON.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  // GET-запросы не используют body.
  if (method === 'GET') {
    return { parsedBody: {}, rawBody: '' }
  }

  // readJsonBody возвращает parsed JSON и raw body для подписи.
  const result = await readJsonBody<unknown>(req)
  return { parsedBody: result.parsed, rawBody: result.raw }
}
