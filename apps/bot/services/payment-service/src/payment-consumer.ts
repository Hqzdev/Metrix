import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { writeAuditLog } from '@metrix/audit-log'
import type { MetricsRegistry } from '@metrix/observability'
import type { PrismaClient } from '@prisma/client'
import type { BookingServiceClient } from './booking-service-client.js'
import type { BookingConfirmation } from './booking-service-client.js'
import type { PaymentServiceLogger } from './logger.js'

// Событие, которое payment-router публикует после полной оплаты.
type PaymentCompletedEvent = {
  chatId: number
  invoiceId: string
  resourceId: string
  slotId: string
  telegramUserId: number
  totalAmountMinorUnits: number
}

// Зависимости consumer-а.
type PaymentConsumerDependencies = {
  bookingClient: BookingServiceClient
  bus: RedisBus
  logger: PaymentServiceLogger
  metrics?: MetricsRegistry
  prisma: PrismaClient
}

// Consumer group для Redis stream.
const CONSUMER_GROUP = 'payment-service'
// Как часто измеряем lag.
const LAG_COLLECTION_INTERVAL_MS = 30_000
// Как часто возвращаемся к pending messages.
const PENDING_RETRY_INTERVAL_MS = 60_000

/**
 * Подписывается на PAYMENT_COMPLETED и создаёт бронирование в booking-service.
 *
 * важно:
 * - вызывается после того как Telegram подтвердил оплату — booking-service
 *   вызывается ровно один раз на каждое событие.
 * - ошибка booking-service пробрасывается наверх, чтобы consumer framework
 *   мог принять решение о retry.
 */
export async function startPaymentConsumer(deps: PaymentConsumerDependencies): Promise<void> {
  // Подписываемся на PAYMENT_COMPLETED.
  await deps.bus.consume<PaymentCompletedEvent>(
    STREAMS.PAYMENT_COMPLETED,
    CONSUMER_GROUP,
    'payment-worker',
    async (event) => {
      await handlePaymentCompleted(event, deps)
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      // Lag помогает видеть, отстаёт ли consumer.
      onLag: (lag) => {
        deps.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.PAYMENT_COMPLETED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )
}

/**
 * Создаёт бронирование после подтверждения оплаты.
 */
async function handlePaymentCompleted(event: PaymentCompletedEvent, deps: PaymentConsumerDependencies): Promise<void> {
  // booking нужен после успешного вызова booking-service.
  let booking: BookingConfirmation
  try {
    // Создаём booking с idempotency key от invoiceId.
    booking = await deps.bookingClient.createBooking(
      event.telegramUserId,
      event.resourceId,
      event.slotId,
      `payment:${event.invoiceId}`,
    )
    // Если booking создан, закрываем hold и saga.
    await deps.prisma.$transaction(async (tx) => {
      await tx.slotHold.updateMany({
        data: { status: 'paid' },
        where: { invoiceId: event.invoiceId, status: 'held' },
      })
      await tx.paymentSaga.updateMany({
        data: { bookingId: booking.id, status: 'completed' },
        where: { invoiceId: event.invoiceId },
      })
      await writeAuditLog(tx, {
        action: 'payment.booking_created',
        actorUserId: event.telegramUserId,
        entityId: event.invoiceId,
        entityType: 'payment_saga',
        payload: {
          bookingId: booking.id,
          resourceId: event.resourceId,
          slotId: event.slotId,
        },
        service: 'payment',
      })
    })
  } catch (error) {
    // Ошибка booking-service переводит saga в failed для ручного recovery.
    const failureReason = error instanceof Error ? error.message : 'booking create failed'
    await deps.prisma.$transaction(async (tx) => {
      await tx.paymentSaga.updateMany({
        data: {
          failureReason,
          status: 'failed',
        },
        where: { invoiceId: event.invoiceId },
      })
      await writeAuditLog(tx, {
        action: 'payment.booking_failed',
        actorUserId: event.telegramUserId,
        entityId: event.invoiceId,
        entityType: 'payment_saga',
        payload: {
          failureReason,
          resourceId: event.resourceId,
          slotId: event.slotId,
        },
        service: 'payment',
      })
    })
    deps.logger.error({
      message: 'Failed to create booking after payment',
      service: 'payment-service',
      action: 'booking.create.failed',
      invoiceId: event.invoiceId,
      telegramUserId: event.telegramUserId,
      resourceId: event.resourceId,
      slotId: event.slotId,
      error,
    })
    // Пробрасываем ошибку, чтобы Redis consumer мог retry.
    throw error
  }

  // Собираем короткое сообщение подтверждения для пользователя.
  const confirmationText = [
    'Booking confirmed.',
    '',
    booking.locationName ?? '',
    booking.resourceName ?? '',
    booking.startsAt && booking.endsAt ? `${booking.startsAt} - ${booking.endsAt}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Просим notification-service отправить подтверждение.
  await deps.bus.publish(STREAMS.NOTIFICATION_SEND, {
    type: 'send_message',
    chatId: event.chatId,
    text: confirmationText,
  })
}
