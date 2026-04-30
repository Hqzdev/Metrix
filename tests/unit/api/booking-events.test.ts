import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookingResponse } from '../../../packages/api/src/contracts/bookings.js'
import {
  BookingEventBus,
  bookingEventNames,
  createBookingEventPayload,
} from '../../../packages/api/src/shared/events/booking-events.js'

const booking: BookingResponse = {
  endsAt: '2026-04-30T12:00:00.000Z',
  id: 'booking-1',
  locationId: 'location-1',
  locationName: 'Metrix Center',
  paidAmountMinorUnits: 3200000,
  priceLabel: '32 000 ₽',
  resourceId: 'resource-1',
  resourceName: 'Switchyard Desks',
  startsAt: '2026-04-30T09:00:00.000Z',
  status: 'active',
  telegramUserId: 123,
}

test('BookingEventBus emits booking.created to registered handler', async () => {
  const bus = new BookingEventBus()
  const payload = createBookingEventPayload(booking)
  const received: string[] = []

  bus.on(bookingEventNames.bookingCreated, (eventPayload) => {
    received.push(eventPayload.booking.id)
  })

  await bus.emit(bookingEventNames.bookingCreated, payload)

  assert.deepEqual(received, ['booking-1'])
})

test('createBookingEventPayload adds occurredAt date', () => {
  const payload = createBookingEventPayload(booking)

  assert.equal(payload.booking.id, 'booking-1')
  assert.ok(Date.parse(payload.occurredAt) > 0)
})
