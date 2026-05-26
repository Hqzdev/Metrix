import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { QUEUE_NAMES, type ReminderJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'
import { parseReminderJobData } from '../validation.js'

// За сколько минут до начала отправляем напоминание.
// Должно совпадать со значением в booking-service/src/reminder-scheduler.ts.
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
 * - перед отправкой проверяем статус через Prisma: если бронь отменена/перенесена —
 *   не отправляем (на случай гонки между cancelReminder и выполнением job)
 */ 
export function startReminderWorker(
  connection: Redis,
  prisma: PrismaClient,
  bus: RedisBus,
  logger: WorkerLogger,
): Worker<ReminderJobData> {
  const worker = new Worker<ReminderJobData>(
    QUEUE_NAMES.REMINDERS,
    async (job) => {
      // Достаём данные, которые booking-service положил в delayed job.
      const { bookingId, telegramUserId, chatId, resourceName, locationName, startsAt, language } = parseReminderJobData(job.data)

      logger.info({
        message: 'Processing reminder job',
        service: 'worker-service',
        jobId: job.id,
        bookingId,
        telegramUserId,
      })

      // Проверяем статус брони — на случай гонки с cancelReminder.
      const booking = await prisma.booking.findUnique({
        select: { status: true },
        where: { id: bookingId },
      })

      // Если бронь отменена или не найдена, напоминание уже не нужно.
      if (!booking || booking.status !== 'active') {
        logger.info({
          message: 'Skipping reminder — booking is not active',
          service: 'worker-service',
          jobId: job.id,
          bookingId,
          status: booking?.status ?? 'not found',
        })
        return
      }

      // Текст сообщения зависит от языка пользователя.
      const text = language === 'ru'
        ? `🔔 Напоминание о бронировании\n\n` +
          `📍 ${locationName} — ${resourceName}\n` +
          `🕐 Начало через ${REMINDER_LEAD_TIME_MINUTES} минут: ${startsAt}`
        : `🔔 Booking reminder\n\n` +
          `📍 ${locationName} — ${resourceName}\n` +
          `🕐 Starts in ${REMINDER_LEAD_TIME_MINUTES} minutes: ${startsAt}`

      // Реальную отправку делает notification-service.
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
        language,
      })
    },
    {
      connection,
      concurrency: 10,
    },
  )

  // Логируем падения jobs, чтобы видеть проблемы Telegram/Redis/DB.
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
