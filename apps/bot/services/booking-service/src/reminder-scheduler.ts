import { Queue } from 'bullmq'
import type Redis from 'ioredis'

// за сколько минут до начала отправляем напоминание
const REMINDER_LEAD_TIME_MINUTES = 15

type ReminderJobData = {
  bookingId: string
  telegramUserId: number
  chatId: number
  resourceName: string
  locationName: string
  startsAt: string
  startsAtIso: string
}

/**
 * Клиент для постановки напоминаний в BullMQ очередь.
 *
 * Booking-service ставит delayed job при создании бронирования.
 * Worker-service выполняет job в нужное время и отправляет уведомление.
 *
 * chatId передаётся опционально — если не известен, напоминание не ставится.
 * В Telegram chatId === userId для private chats, но booking-service не всегда
 * имеет chatId (только при создании через бота напрямую).
 */
export class ReminderScheduler {
  private readonly queue: Queue<ReminderJobData>

  constructor(redis: Redis) {
    this.queue = new Queue('reminders', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    })
  }

  async scheduleReminder(data: ReminderJobData): Promise<void> {
    const delay = calcDelayMs(data.startsAtIso)
    if (delay <= 0) {
      // бронирование уже началось или в прошлом — не ставим reminder
      return
    }

    await this.queue.add('send-reminder', data, {
      delay,
      jobId: `reminder:${data.bookingId}`, // idempotent job id — дубль не создастся
    })
  }

  async cancelReminder(bookingId: string): Promise<void> {
    // удаляем delayed job если бронирование отменено до срабатывания
    const job = await this.queue.getJob(`reminder:${bookingId}`)
    if (job) await job.remove()
  }
}

function calcDelayMs(startsAtIso: string): number {
  const fireAt = new Date(startsAtIso).getTime() - REMINDER_LEAD_TIME_MINUTES * 60 * 1_000
  return fireAt - Date.now()
}
