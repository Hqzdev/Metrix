import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

// За сколько минут до начала отправляем напоминание.
const REMINDER_LEAD_TIME_MINUTES = 15

// Данные, которые worker-service получит из очереди reminders.
type ReminderJobData = {
  // ID бронирования, чтобы job была связана с конкретной записью.
  bookingId: string
  // Telegram user id получателя.
  telegramUserId: number
  // Chat id, куда отправлять сообщение.
  chatId: number
  // Язык пользователя для локализации текста напоминания.
  language: 'en' | 'ru'
  // Название ресурса для текста уведомления.
  resourceName: string
  // Название локации для текста уведомления.
  locationName: string
  // Человекочитаемое время начала.
  startsAt: string
  // ISO-время начала, по нему считается delay.
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
  // BullMQ queue хранит delayed jobs до момента отправки.
  private readonly queue: Queue<ReminderJobData>

  constructor(redis: Redis) {
    // Очередь называется reminders, worker-service слушает то же имя.
    this.queue = new Queue('reminders', {
      connection: redis,
      defaultJobOptions: {
        // Успешные jobs сразу удаляем, чтобы очередь не росла бесконечно.
        removeOnComplete: true,
        // Последние 100 упавших jobs оставляем для диагностики.
        removeOnFail: 100,
        // Несколько попыток помогают пережить временные сбои Telegram/API.
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    })
  }

  /**
   * Ставит отложенное напоминание в очередь.
   */
  async scheduleReminder(data: ReminderJobData): Promise<void> {
    // delay показывает, через сколько миллисекунд нужно выполнить job.
    const delay = calcDelayMs(data.startsAtIso)
    if (delay <= 0) {
      // Бронирование уже началось или в прошлом — не ставим reminder.
      return
    }

    await this.queue.add('send-reminder', data, {
      delay,
      jobId: `reminder:${data.bookingId}`, // Idempotent job id — дубль не создастся.
    })
  }

  /**
   * Удаляет напоминание, если бронирование отменили до его срабатывания.
   */
  async cancelReminder(bookingId: string): Promise<void> {
    const job = await this.queue.getJob(`reminder:${bookingId}`)
    if (job) await job.remove()
  }
}

/**
 * Считает задержку до момента отправки напоминания.
 */
function calcDelayMs(startsAtIso: string): number {
  // fireAt — время старта минус lead time.
  const fireAt = new Date(startsAtIso).getTime() - REMINDER_LEAD_TIME_MINUTES * 60 * 1_000
  return fireAt - Date.now()
}
