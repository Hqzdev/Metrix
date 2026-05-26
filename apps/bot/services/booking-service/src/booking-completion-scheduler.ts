import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

// Данные, которые worker-service получает для автоматического завершения booking.
export type CompletionJobData = {
  // ID бронирования, которое нужно перевести в completed.
  bookingId: string
  // Telegram user id владельца бронирования.
  telegramUserId: number
}

/** 
 * Клиент для постановки задач автоматического завершения бронирований.
 *
 * Booking-service ставит delayed job при создании бронирования.
 * Worker-service выполняет job в момент окончания брони (endsAtIso)
 * и переводит статус active → completed.
 *
 * Аналогично ReminderScheduler: выполнение не критично для основного flow,
 * поэтому инициализация опциональна.
 */
export class BookingCompletionScheduler {
  // BullMQ queue хранит delayed jobs до времени окончания брони.
  private readonly queue: Queue<CompletionJobData>

  constructor(redis: Redis) {
    // Worker-service должен слушать очередь с таким же именем.
    this.queue = new Queue('booking-completions', {
      connection: redis,
      defaultJobOptions: {
        // Успешные jobs чистим сразу.
        removeOnComplete: true,
        // Упавшие jobs оставляем ограниченно, чтобы можно было посмотреть причины.
        removeOnFail: 100,
        // Completion важен для статусов, поэтому попыток больше, чем у reminder.
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    })
  }

  /**
   * Ставит задачу завершения бронирования на момент endsAtIso.
   */
  async scheduleCompletion(data: CompletionJobData, endsAtIso: string): Promise<void> {
    // delay показывает, сколько ждать до выполнения job.
    const delay = calcDelayMs(endsAtIso)
    if (delay <= 0) {
      // Бронирование уже закончилось — не ставим job, worker не нужен.
      return
    }

    await this.queue.add('complete-booking', data, {
      delay,
      jobId: `completion:${data.bookingId}`, // Idempotent job id не создаёт дубли.
    })
  }

  /**
   * Отменяет completion job, если booking отменили или перенесли.
   */
  async cancelCompletion(bookingId: string): Promise<void> {
    const job = await this.queue.getJob(`completion:${bookingId}`)
    if (job) await job.remove()
  }

  /**
   * Закрывает BullMQ Queue и освобождает ресурсы.
   *
   * Должен вызываться в graceful shutdown до закрытия Redis-соединения:
   * BullMQ бросает unhandled error, если Redis отключается раньше Queue.
   */
  async close(): Promise<void> {
    await this.queue.close()
  }
}

/**
 * Считает задержку до времени окончания бронирования.
 */
function calcDelayMs(endsAtIso: string): number {
  return new Date(endsAtIso).getTime() - Date.now()
}
