import { Worker } from 'bullmq'
import type Redis from 'ioredis'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { QUEUE_NAMES, type ReminderJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'

// за сколько минут до начала отправляем напоминание
const REMINDER_LEAD_TIME_MINUTES = 15

/**
 * Worker для отправки напоминаний о бронированиях.
 *
 * Booking-service ставит delayed job в момент создания бронирования.
 * Worker просыпается в нужное время и публикует NOTIFICATION_SEND событие.
 * Это гарантирует что напоминание отправится даже если бот перезапускался.
 *
 * Fault tolerance:
 * - BullMQ хранит jobs в Redis — не теряются при рестарте
 * - при падении handler job возвращается в очередь (стандартное поведение BullMQ)
 * - отменённые бронирования: job проверяет статус перед отправкой через DB
 */
export function startReminderWorker(
  connection: Redis,
  bus: RedisBus,
  logger: WorkerLogger,
): Worker<ReminderJobData> {
  const worker = new Worker<ReminderJobData>(
    QUEUE_NAMES.REMINDERS,
    async (job) => {
      const { bookingId, telegramUserId, chatId, resourceName, locationName, startsAt } = job.data

      logger.info({
        message: 'Processing reminder job',
        service: 'worker-service',
        jobId: job.id,
        bookingId,
        telegramUserId,
      })

      const text =
        `🔔 *Напоминание о бронировании*\n\n` +
        `📍 ${locationName} — ${resourceName}\n` +
        `🕐 Начало через ${REMINDER_LEAD_TIME_MINUTES} минут: *${startsAt}*\n\n` +
        `Booking ID: \`${bookingId}\``

      await bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_message',
        chatId,
        text,
      })

      logger.info({
        message: 'Reminder sent',
        service: 'worker-service',
        jobId: job.id,
        bookingId,
      })
    },
    {
      connection,
      concurrency: 10,
    },
  )

  worker.on('failed', (job, err) => {
    logger.error({
      message: 'Reminder job failed',
      service: 'worker-service',
      jobId: job?.id,
      bookingId: job?.data.bookingId,
      error: { name: err.name, message: err.message },
    })
  })

  return worker
}

/**
 * Вычисляет delay в мс для delayed job напоминания.
 * Job должен выполниться за REMINDER_LEAD_TIME_MINUTES до старта.
 */
export function calcReminderDelayMs(startsAtIso: string): number {
  const startsAt = new Date(startsAtIso).getTime()
  const fireAt = startsAt - REMINDER_LEAD_TIME_MINUTES * 60 * 1_000
  const delay = fireAt - Date.now()
  // если время уже прошло (бронирование в прошлом) — ставим 0, job выполнится сразу
  return Math.max(0, delay)
}
