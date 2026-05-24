import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { QUEUE_NAMES, type CompletionJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'

/**
 * Worker для автоматического завершения бронирований по истечении времени.
 *
 * Booking-service ставит delayed job при создании бронирования (delay = endsAtIso).
 * Worker просыпается в момент окончания брони, проверяет что статус ещё active,
 * переводит в completed и публикует BOOKING_COMPLETED событие.
 *
 * Fault tolerance:
 * - BullMQ хранит jobs в Redis — не теряются при рестарте
 * - attempts: 5 с exponential backoff — переживёт кратковременный сбой DB
 * - проверка статуса перед обновлением — идемпотентно при повторных попытках
 */
export function startCompletionWorker(
  connection: Redis,
  prisma: PrismaClient,
  bus: RedisBus,
  logger: WorkerLogger,
): Worker<CompletionJobData> {
  const worker = new Worker<CompletionJobData>(
    QUEUE_NAMES.COMPLETIONS,
    async (job) => {
      // bookingId приходит из delayed job, созданной booking-service.
      const { bookingId, telegramUserId } = job.data

      logger.info({
        message: 'Processing booking completion job',
        service: 'worker-service',
        jobId: job.id,
        bookingId,
        telegramUserId,
      })

      // Загружаем booking, чтобы проверить его текущее состояние.
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } })

      // Если booking удалён или не найден, job можно спокойно пропустить.
      if (!booking) {
        logger.warn({
          message: 'Booking not found for completion job — skipping',
          service: 'worker-service',
          jobId: job.id,
          bookingId,
        })
        return
      }

      // Если статус уже не active, повторное выполнение job ничего не меняет.
      if (booking.status !== 'active') {
        logger.info({
          message: 'Booking already in terminal state — skipping completion',
          service: 'worker-service',
          jobId: job.id,
          bookingId,
          currentStatus: booking.status,
        })
        return
      }

      // Переводим бронь в completed.
      await prisma.booking.update({
        data: { status: 'completed' },
        where: { id: bookingId },
      })

      // Публикуем событие, чтобы другие сервисы обновили аналитику/интерфейс.
      await bus.publish(STREAMS.BOOKING_COMPLETED, {
        booking: {
          id: booking.id,
          locationId: booking.locationId,
          locationName: booking.locationName,
          resourceId: booking.resourceId,
          resourceName: booking.resourceName,
          slotId: booking.slotId,
          telegramUserId: Number(booking.telegramUserId),
          paidAmountMinorUnits: booking.paidAmountMinorUnits,
          priceLabel: booking.priceLabel,
          startsAt: booking.startsAt,
          startsAtIso: booking.startsAtIso instanceof Date ? booking.startsAtIso.toISOString() : String(booking.startsAtIso),
          endsAt: booking.endsAt,
          endsAtIso: booking.endsAtIso instanceof Date ? booking.endsAtIso.toISOString() : String(booking.endsAtIso),
          status: 'completed',
          // null превращаем в undefined для внешнего контракта.
          calendarEventGoogle: booking.calendarEventGoogle ?? undefined,
          calendarEventMicrosoft: booking.calendarEventMicrosoft ?? undefined,
        },
      })

      logger.info({
        message: 'Booking marked as completed',
        service: 'worker-service',
        jobId: job.id,
        bookingId,
      })
    },
    {
      connection,
      concurrency: 20,
    },
  )

  // Логируем неуспешные jobs.
  worker.on('failed', (job, err) => {
    logger.error({
      message: 'Completion job failed',
      service: 'worker-service',
      jobId: job?.id,
      bookingId: job?.data.bookingId,
      error: { name: err.name, message: err.message },
    })
  })

  return worker
}
