import type { Queue } from 'bullmq'
import type { BookingReminderJobData } from '../../queues/booking-reminder-queue.js'
import { enqueueBookingReminderJob } from '../../queues/booking-reminder-queue.js'
import type { CalendarSyncJobData } from '../../queues/calendar-sync-queue.js'
import { enqueueCalendarSyncJob } from '../../queues/calendar-sync-queue.js'
import type { AvailabilityHub } from '../../realtime/availability-hub.js'
import { bookingEventNames, type BookingEventBus } from './booking-events.js'

export type BookingEventHandlerDependencies = {
  availabilityHub?: AvailabilityHub
  bookingReminderQueue?: Queue<BookingReminderJobData>
  calendarSyncQueue?: Queue<CalendarSyncJobData>
}

// связывает доменные события с очередями и websocket
export function registerBookingEventHandlers(
  eventBus: BookingEventBus,
  dependencies: BookingEventHandlerDependencies,
): void {
  eventBus.on(bookingEventNames.bookingCreated, async (payload) => {
    dependencies.availabilityHub?.broadcastAvailabilityChanged(payload)

    if (dependencies.calendarSyncQueue) {
      await enqueueCalendarSyncJob(dependencies.calendarSyncQueue, {
        eventName: bookingEventNames.bookingCreated,
        payload,
      })
    }

    if (dependencies.bookingReminderQueue) {
      await enqueueBookingReminderJob(dependencies.bookingReminderQueue, payload.booking)
    }
  })

  eventBus.on(bookingEventNames.bookingCancelled, async (payload) => {
    dependencies.availabilityHub?.broadcastAvailabilityChanged(payload)

    if (dependencies.calendarSyncQueue) {
      await enqueueCalendarSyncJob(dependencies.calendarSyncQueue, {
        eventName: bookingEventNames.bookingCancelled,
        payload,
      })
    }
  })

  eventBus.on(bookingEventNames.bookingUpdated, async (payload) => {
    dependencies.availabilityHub?.broadcastAvailabilityChanged(payload)

    if (dependencies.calendarSyncQueue) {
      await enqueueCalendarSyncJob(dependencies.calendarSyncQueue, {
        eventName: bookingEventNames.bookingUpdated,
        payload,
      })
    }
  })
}
