import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  validateCancelBookingRequest,
  validateCreateBookingRequest,
  validateRescheduleBookingRequest,
} from '../../../packages/api/src/modules/bookings/booking-validators.js'

test('validateCreateBookingRequest accepts booking by slot', () => {
  const result = validateCreateBookingRequest({
    resourceId: 'r1',
    slotId: 'r1m',
    telegramUserId: 123,
  })

  assert.equal(result.status, 'ok')
})

test('validateCreateBookingRequest rejects invalid iso date', () => {
  const result = validateCreateBookingRequest({
    endsAt: 'not-a-date',
    resourceId: 'r1',
    startsAt: '2026-04-30T10:00:00.000Z',
  })

  assert.equal(result.status, 'error')
})

test('validateCancelBookingRequest requires bookingId', () => {
  const result = validateCancelBookingRequest({})

  assert.equal(result.status, 'error')
})

test('validateRescheduleBookingRequest accepts bookingId and newSlotId', () => {
  const result = validateRescheduleBookingRequest({
    bookingId: 'booking-1',
    newSlotId: 'slot-1',
  })

  assert.equal(result.status, 'ok')
})
