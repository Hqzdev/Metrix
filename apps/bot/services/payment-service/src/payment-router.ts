import { randomUUID } from 'node:crypto'
import { audit, extractUserId, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { writeAuditLog } from '@metrix/audit-log'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import type { PaymentServiceConfig } from './config.js'
import { AuthenticationError, ConflictError, NotFoundError, PaymentServiceError, ReplayAttackError, ValidationError } from './errors.js'
import { sendJson } from './http-response.js'
import type { PaymentServiceLogger } from './logger.js'
import type { BookingServiceClient } from './booking-service-client.js'

// Telegram Stars ограничивает сумму одного инвойса значением 9 999 999 минимальных единиц.
// Суммы выше разбиваются на последовательные инвойсы.
const TELEGRAM_MAX_INVOICE_MINOR_UNITS = 9_900_000
const SLOT_HOLD_TTL_MS = 10 * 60 * 1000

type PaymentRouterDependencies = {
  bookingClient: BookingServiceClient
  bus: RedisBus
  config: PaymentServiceConfig
  logger: PaymentServiceLogger
  prisma: PrismaClient
}

type RequestContext = {
  callerName: string
  callerUserId: number | undefined
  method: string
  parsedBody: unknown
  path: string
  requestId: string
}

type PreCheckoutQuery = {
  id: string
  from: { id: number }
  currency: string
  total_amount: number
  invoice_payload: string
}

type SuccessfulPaymentMessage = {
  chat: { id: number }
  from?: { id: number }
  successful_payment: { invoice_payload: string; total_amount: number }
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
      return { callerName: 'health-check', callerUserId: undefined, method, parsedBody: {}, path, requestId: 'health-check' }
    }

    const { parsedBody, rawBody } = await readRequestBody(req, method)
    const auth = verifyServiceRequest(req, rawBody, this.deps.config.trustedCallers)

    if (!auth.ok) {
      throw new AuthenticationError(auth.error)
    }

    const fresh = await this.deps.bus.checkReplay(auth.requestId)
    if (!fresh) {
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
    }
  }

  /**
   * Извлекает проверенный Telegram user id из доверенных заголовков.
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

    if (method === 'POST' && path === '/invoices') {
      return { body: await this.createInvoice(context), statusCode: 201 }
    }

    if (method === 'POST' && path === '/pre-checkout') {
      return { body: await this.handlePreCheckout(context), statusCode: 200 }
    }

    if (method === 'POST' && path === '/successful-payment') {
      return { body: await this.handleSuccessfulPayment(context), statusCode: 200 }
    }

    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/compensate')) {
      return { body: await this.compensateSaga(context), statusCode: 200 }
    }

    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/retry-booking')) {
      return { body: await this.retrySagaBooking(context), statusCode: 200 }
    }

    if (method === 'POST' && path.startsWith('/sagas/') && path.endsWith('/mark-compensated')) {
      return { body: await this.markSagaCompensated(context), statusCode: 200 }
    }

    if (method === 'GET' && path.startsWith('/sagas/')) {
      return { body: await this.getSaga(context), statusCode: 200 }
    }

    throw new NotFoundError()
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   */
  private async createInvoice(context: RequestContext): Promise<{ ok: boolean; invoiceId: string }> {
    const body = context.parsedBody as { chatId?: unknown; telegramUserId?: unknown; resourceId?: unknown; slotId?: unknown }

    const userId = resolveUserId(context.callerUserId, body.telegramUserId)
    const chatId = resolveChatId(body.chatId)

    if (typeof body.resourceId !== 'string' || !body.resourceId) {
      throw new ValidationError('resourceId is required')
    }

    if (typeof body.slotId !== 'string' || !body.slotId) {
      throw new ValidationError('slotId is required')
    }

    const resource = await this.deps.bookingClient.getResource(body.resourceId)
    if (!resource) {
      throw new NotFoundError('resource not found')
    }

    const slotAvailable = await this.deps.bookingClient.isSlotAvailable(body.resourceId, body.slotId)
    if (!slotAvailable) {
      throw new ConflictError('slot is already booked')
    }

    const total = resource.priceMinorUnits
    const firstAmount = Math.min(TELEGRAM_MAX_INVOICE_MINOR_UNITS, total)
    const totalParts = Math.ceil(total / TELEGRAM_MAX_INVOICE_MINOR_UNITS)
    const invoiceId = randomUUID()
    const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS)

    try {
      await this.deps.prisma.$transaction(async (tx) => {
        await tx.slotHold.updateMany({
          data: { status: 'expired' },
          where: {
            resourceId: body.resourceId as string,
            slotId: body.slotId as string,
            status: 'held',
            expiresAt: { lt: new Date() },
          },
        })

        const hold = await tx.slotHold.create({
          data: {
            expiresAt,
            resourceId: body.resourceId as string,
            slotId: body.slotId as string,
            telegramUserId: BigInt(userId),
          },
        })

        await tx.pendingInvoice.create({
          data: {
            id: invoiceId,
            amountMinorUnits: firstAmount,
            holdId: hold.id,
            locationId: resource.locationId,
            paidAmountMinorUnits: 0,
            partNumber: 1,
            resourceId: body.resourceId as string,
            slotId: body.slotId as string,
            status: 'pending',
            telegramUserId: BigInt(userId),
            totalAmountMinorUnits: total,
            totalParts,
          },
        })

        await tx.slotHold.update({
          data: { invoiceId },
          where: { id: hold.id },
        })

        await tx.paymentSaga.create({
          data: {
            chatId: BigInt(chatId),
            currentPart: 1,
            invoiceId,
            paidAmount: 0,
            resourceId: body.resourceId as string,
            slotId: body.slotId as string,
            status: 'pending',
            telegramUserId: BigInt(userId),
            totalAmount: total,
            totalParts,
          },
        })

        await writeAuditLog(tx, {
          action: 'invoice.created',
          actorUserId: userId,
          entityId: invoiceId,
          entityType: 'invoice',
          payload: {
            resourceId: body.resourceId,
            slotId: body.slotId,
            totalAmountMinorUnits: total,
          },
          requestId: context.requestId,
          service: 'payment',
        })
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError('slot is already held or booked')
      }
      throw error
    }

    await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_invoice',
      chatId,
      invoiceId,
      title: `Booking: ${resource.name}`,
      description: `${resource.name} — ${resource.priceLabel}`,
      payload: invoiceId,
      providerToken: this.deps.config.providerToken,
      currency: this.deps.config.currency,
      amount: firstAmount,
    })

    audit({
      ts: new Date().toISOString(),
      service: 'payment',
      action: 'invoice.created',
      userId,
      invoiceId,
      resourceId: body.resourceId,
      requestId: context.requestId,
    })
    return { ok: true, invoiceId }
  }

  /**
   * Выполняет шаг handlePreCheckout внутри сервисного сценария.
   */
  private async handlePreCheckout(context: RequestContext): Promise<{ ok: boolean; errorMessage?: string }> {
    const body = context.parsedBody as { query?: PreCheckoutQuery }
    const query = body.query

    if (!query) {
      return { ok: false, errorMessage: 'missing query' }
    }

    const invoice = await this.deps.prisma.pendingInvoice.findUnique({ where: { id: query.invoice_payload } })

    if (!invoice || Number(invoice.telegramUserId) !== query.from.id || invoice.status !== 'pending') {
      return { ok: false, errorMessage: 'Invoice not found for your account.' }
    }

    if (query.currency !== this.deps.config.currency || query.total_amount !== invoice.amountMinorUnits) {
      return { ok: false, errorMessage: 'Payment amount mismatch.' }
    }

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
    const body = context.parsedBody as { message?: SuccessfulPaymentMessage }
    const msg = body.message

    if (!msg) {
      return { ok: false }
    }

    const payload = msg.successful_payment.invoice_payload
    const invoice = await this.deps.prisma.pendingInvoice.findUnique({ where: { id: payload } })

    if (!invoice || !msg.from || Number(invoice.telegramUserId) !== msg.from.id) {
      const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId: payload } })
      if (saga && msg.from && Number(saga.telegramUserId) === msg.from.id && ['awaiting_booking', 'completed'].includes(saga.status)) {
        return { ok: true }
      }

      // платёж подтверждён Telegram, но инвойс не найден — нужна ручная проверка
      await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_message',
        chatId: msg.chat.id,
        text: 'Payment received, but booking could not be matched. Contact support.',
      })
      return { ok: false }
    }

    if (invoice.status !== 'pending') {
      return { ok: invoice.status === 'completed' || invoice.status === 'paid_part' }
    }

    const paid = Number(invoice.paidAmountMinorUnits) + Number(invoice.amountMinorUnits)
    const hold = await this.deps.prisma.slotHold.findFirst({ where: { invoiceId: invoice.id } })

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
        await writeAuditLog(tx, {
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
      })
      await this.deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_message',
        chatId: msg.chat.id,
        text: 'Payment received, but the booking hold expired. Contact support.',
      })
      return { ok: false }
    }

    if (paid < Number(invoice.totalAmountMinorUnits)) {
      return this.issueNextInvoicePart(msg.chat.id, invoice, paid)
    }

    await this.deps.bus.publish(STREAMS.PAYMENT_COMPLETED, {
      telegramUserId: Number(invoice.telegramUserId),
      chatId: msg.chat.id,
      resourceId: invoice.resourceId,
      slotId: invoice.slotId,
      totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
      invoiceId: payload,
    })

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
      await writeAuditLog(tx, {
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
    })

    return { ok: true }
  }

  private async issueNextInvoicePart(
    chatId: number,
    invoice: { id: string; partNumber: number; totalParts: number; totalAmountMinorUnits: number; [key: string]: unknown },
    paid: number,
  ): Promise<{ ok: boolean }> {
    const nextAmount = Math.min(TELEGRAM_MAX_INVOICE_MINOR_UNITS, Number(invoice.totalAmountMinorUnits) - paid)
    const nextId = randomUUID()
    const nextPartNumber = Number(invoice.partNumber) + 1
    const nextExpiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS)

    await this.deps.prisma.$transaction(async (tx) => {
      await tx.pendingInvoice.update({
        data: { paidAmountMinorUnits: paid, status: 'paid_part', supersededByInvoiceId: nextId },
        where: { id: invoice.id },
      })
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
      await tx.slotHold.updateMany({
        data: { expiresAt: nextExpiresAt, invoiceId: nextId },
        where: { invoiceId: invoice.id },
      })
      await tx.paymentSaga.updateMany({
        data: { currentPart: nextPartNumber, invoiceId: nextId, paidAmount: paid, status: 'awaiting_next_part' },
        where: { invoiceId: invoice.id },
      })
      await writeAuditLog(tx, {
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
    })

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
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/compensate')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (saga.status !== 'failed') throw new ConflictError('only failed saga can be compensated')

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
      await writeAuditLog(tx, {
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
    })

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
    const invoiceId = readIdFromPath(context.path, '/sagas/', '')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')

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
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/retry-booking')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (!['failed', 'awaiting_booking'].includes(saga.status)) {
      throw new ConflictError('only failed or awaiting_booking saga can retry booking creation')
    }

    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.update({
        data: { failureReason: null, status: 'awaiting_booking' },
        where: { invoiceId },
      })
      await writeAuditLog(tx, {
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
    })

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
    const invoiceId = readIdFromPath(context.path, '/sagas/', '/mark-compensated')
    const saga = await this.deps.prisma.paymentSaga.findUnique({ where: { invoiceId } })
    if (!saga) throw new NotFoundError('saga not found')
    if (saga.status !== 'compensating') throw new ConflictError('only compensating saga can be marked compensated')

    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.update({
        data: { status: 'compensated' },
        where: { invoiceId },
      })
      await writeAuditLog(tx, {
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
    })

    return { ok: true }
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof PaymentServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    this.deps.logger.error({
      error,
      message: 'Unhandled payment-service error',
      service: 'payment-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }

}

/**
 * Выбирает доверенный user id из подписи или payload.
 */
function resolveUserId(callerUserId: number | undefined, rawValue: unknown): number {
  const userId = callerUserId ?? Number(rawValue)
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('telegramUserId is required and must be a positive integer')
  }

  return userId
}

function resolveChatId(rawValue: unknown): number {
  const chatId = Number(rawValue)
  if (!chatId || !Number.isInteger(chatId)) {
    throw new ValidationError('chatId is required and must be an integer')
  }

  return chatId
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002'
}

function readIdFromPath(path: string, prefix: string, suffix: string): string {
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
    throw new NotFoundError()
  }

  const id = path.slice(prefix.length, path.length - suffix.length)
  if (id.trim() === '') {
    throw new ValidationError('id is required')
  }

  return id
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
