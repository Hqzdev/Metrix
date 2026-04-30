import { Queue, Worker, type JobsOptions } from 'bullmq'
import type { BookingResponse } from '../contracts/bookings.js'
import type { RedisConnection } from '../shared/redis/redis-client.js'
import { queueNames } from './queue-names.js'

export type BookingReminderJobData = {
  booking: BookingResponse
}

export type BookingReminderHandler = (job: BookingReminderJobData) => Promise<void>

const reminderOffsetMs = 15 * 60 * 1000

const defaultReminderOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    delay: 10_000,
    type: 'exponential',
  },
  removeOnComplete: 100,
  removeOnFail: 500,
}

// очередь напоминаний перед началом брони
export function createBookingReminderQueue(connection: RedisConnection): Queue<BookingReminderJobData> {
  return new Queue<BookingReminderJobData>(queueNames.bookingReminders, {
    connection,
    defaultJobOptions: defaultReminderOptions,
  })
}

export async function enqueueBookingReminderJob(
  queue: Queue<BookingReminderJobData>,
  booking: BookingResponse,
): Promise<void> {
  const startsAtTime = new Date(booking.startsAt).getTime()
  const runAt = startsAtTime - reminderOffsetMs
  const delay = Math.max(runAt - Date.now(), 0)

  await queue.add(`booking-reminder:${booking.id}`, { booking }, { delay })
}

// worker вызывает внешний transport, например telegram sender
export function createBookingReminderWorker(
  connection: RedisConnection,
  handler: BookingReminderHandler,
): Worker<BookingReminderJobData> {
  return new Worker<BookingReminderJobData>(
    queueNames.bookingReminders,
    async (job) => {
      await handler(job.data)
    },
    {
      connection,
      concurrency: 10,
    },
  )
}
