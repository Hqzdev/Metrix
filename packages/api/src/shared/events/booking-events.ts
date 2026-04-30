import type { BookingResponse } from '../../contracts/bookings.js'

export const bookingEventNames = {
  bookingCancelled: 'booking.cancelled',
  bookingCreated: 'booking.created',
  bookingUpdated: 'booking.updated',
} as const

export type BookingEventName = (typeof bookingEventNames)[keyof typeof bookingEventNames]

export type BookingEventPayload = {
  booking: BookingResponse
  occurredAt: string
}

export type BookingEventHandler = (payload: BookingEventPayload) => void | Promise<void>

export type BookingEventPublisher = {
  emit(eventName: BookingEventName, payload: BookingEventPayload): void | Promise<void>
}

// простой event bus для доменных событий бронирований
export class BookingEventBus implements BookingEventPublisher {
  private readonly handlers = new Map<BookingEventName, BookingEventHandler[]>()

  on(eventName: BookingEventName, handler: BookingEventHandler): void {
    const handlers = this.handlers.get(eventName) ?? []
    handlers.push(handler)
    this.handlers.set(eventName, handlers)
  }

  async emit(eventName: BookingEventName, payload: BookingEventPayload): Promise<void> {
    const handlers = this.handlers.get(eventName) ?? []
    await Promise.all(handlers.map((handler) => handler(payload)))
  }
}

export const bookingEventBus = new BookingEventBus()

export function createBookingEventPayload(booking: BookingResponse): BookingEventPayload {
  return {
    booking,
    occurredAt: new Date().toISOString(),
  }
}
