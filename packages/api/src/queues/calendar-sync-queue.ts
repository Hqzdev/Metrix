import { Queue, Worker, type JobsOptions } from 'bullmq'
import type { BookingEventName, BookingEventPayload } from '../shared/events/booking-events.js'
import type { RedisConnection } from '../shared/redis/redis-client.js'
import { queueNames } from './queue-names.js'

export type CalendarSyncJobData = {
  eventName: BookingEventName
  payload: BookingEventPayload
}

export type CalendarSyncHandler = (job: CalendarSyncJobData) => Promise<void>

const defaultCalendarSyncOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    delay: 5_000,
    type: 'exponential',
  },
  removeOnComplete: 100,
  removeOnFail: 500,
}

// очередь синхронизации календарей google и microsoft
export function createCalendarSyncQueue(connection: RedisConnection): Queue<CalendarSyncJobData> {
  return new Queue<CalendarSyncJobData>(queueNames.calendarSync, {
    connection,
    defaultJobOptions: defaultCalendarSyncOptions,
  })
}

export async function enqueueCalendarSyncJob(
  queue: Queue<CalendarSyncJobData>,
  data: CalendarSyncJobData,
): Promise<void> {
  await queue.add(data.eventName, data)
}

// worker оставляет интеграцию календарей снаружи, чтобы адаптеры не смешивались с очередью
export function createCalendarSyncWorker(connection: RedisConnection, handler: CalendarSyncHandler): Worker<CalendarSyncJobData> {
  return new Worker<CalendarSyncJobData>(
    queueNames.calendarSync,
    async (job) => {
      await handler(job.data)
    },
    {
      connection,
      concurrency: 5,
    },
  )
}
