import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bookingCreatedMessage,
  bookingsMessage,
  calendarAuthMessage,
  calendarStatusMessage,
  helpMessage,
  locationsMessage,
  resourcesMessage,
  slotsMessage,
  welcomeMessage,
} from '../../../apps/bot/services/bot-gateway/src/messages.js'

test('welcomeMessage includes name when provided', () => {
  const msg = welcomeMessage('Ivan')
  assert.ok(msg.includes('Ivan'))
})

test('welcomeMessage works without name', () => {
  const msg = welcomeMessage()
  assert.ok(msg.includes('Welcome'))
  assert.ok(!msg.includes('undefined'))
})

test('helpMessage lists all commands', () => {
  const msg = helpMessage()
  assert.ok(msg.includes('/book'))
  assert.ok(msg.includes('/slots'))
  assert.ok(msg.includes('/my_bookings'))
  assert.ok(msg.includes('/calendar'))
  assert.ok(msg.includes('/help'))
})

test('locationsMessage lists all locations', () => {
  const msg = locationsMessage([
    { id: 'l1', name: 'HQ', city: 'Moscow', address: 'Tverskaya 1', occupancy: '30%', members: '50' },
    { id: 'l2', name: 'Branch', city: 'SPb', address: 'Nevsky 10', occupancy: '60%', members: '20' },
  ])
  assert.ok(msg.includes('HQ'))
  assert.ok(msg.includes('Branch'))
})

test('resourcesMessage returns empty notice when no resources', () => {
  const msg = resourcesMessage([])
  assert.ok(msg.includes('No offices'))
})

test('resourcesMessage lists all resources', () => {
  const msg = resourcesMessage([
    { id: 'r1', locationId: 'l1', name: 'Room A', type: 'room', seats: '8', occupancy: '40%', priceLabel: '1 000 ₽', priceMinorUnits: 100000, status: 'active' },
    { id: 'r2', locationId: 'l1', name: 'Desk B', type: 'desk', seats: '1', occupancy: '10%', priceLabel: '200 ₽', priceMinorUnits: 20000, status: 'active' },
  ])
  assert.ok(msg.includes('Room A'))
  assert.ok(msg.includes('Desk B'))
})

test('slotsMessage shows resource name when slots exist', () => {
  const resource = { id: 'r1', locationId: 'l1', name: 'Boardroom', type: 'room', seats: '12', occupancy: '0%', priceLabel: '5 000 ₽', priceMinorUnits: 500000, status: 'active' }
  const slots = [{ id: 'r1m', startsAt: 'May 01, 09:00', endsAt: 'May 01, 12:00', startsAtIso: '', endsAtIso: '' }]
  const msg = slotsMessage(resource, slots)
  assert.ok(msg.includes('Boardroom'))
})

test('slotsMessage returns no-slots notice when list is empty', () => {
  const resource = { id: 'r1', locationId: 'l1', name: 'Boardroom', type: 'room', seats: '12', occupancy: '0%', priceLabel: '5 000 ₽', priceMinorUnits: 500000, status: 'active' }
  const msg = slotsMessage(resource, [])
  assert.ok(msg.includes('no available slots'))
})

test('bookingsMessage returns empty notice when no bookings', () => {
  const msg = bookingsMessage([])
  assert.ok(msg.includes('no active bookings'))
})

test('bookingsMessage lists bookings with location and resource', () => {
  const booking = {
    id: 'b1', locationId: 'l1', locationName: 'HQ', resourceId: 'r1', resourceName: 'Room A',
    slotId: 'r1m', telegramUserId: 123, paidAmountMinorUnits: 100000, priceLabel: '1 000 ₽',
    startsAt: 'May 01, 09:00', endsAt: 'May 01, 12:00', startsAtIso: '', endsAtIso: '', status: 'active' as const,
  }
  const msg = bookingsMessage([booking])
  assert.ok(msg.includes('HQ'))
  assert.ok(msg.includes('Room A'))
})

test('bookingCreatedMessage shows location, resource and price', () => {
  const booking = {
    id: 'b1', locationId: 'l1', locationName: 'HQ', resourceId: 'r1', resourceName: 'Room A',
    slotId: 'r1m', telegramUserId: 123, paidAmountMinorUnits: 100000, priceLabel: '1 000 ₽',
    startsAt: 'May 01, 09:00', endsAt: 'May 01, 12:00', startsAtIso: '', endsAtIso: '', status: 'active' as const,
  }
  const msg = bookingCreatedMessage(booking)
  assert.ok(msg.includes('HQ'))
  assert.ok(msg.includes('1 000 ₽'))
  assert.ok(msg.includes('Booking confirmed'))
})

test('calendarAuthMessage returns not-configured when no googleUrl', () => {
  const msg = calendarAuthMessage({})
  assert.ok(msg.includes('not configured'))
})

test('calendarAuthMessage includes instruction when googleUrl provided', () => {
  const msg = calendarAuthMessage({ googleUrl: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' })
  assert.ok(msg.includes('Google'))
})

test('calendarStatusMessage lists connected google provider', () => {
  const msg = calendarStatusMessage(['google'])
  assert.ok(msg.includes('Google Calendar'))
  assert.ok(msg.includes('connected'))
})

test('calendarStatusMessage shows disconnect hint when providers exist', () => {
  const msg = calendarStatusMessage(['google'])
  assert.ok(msg.includes('disconnect'))
})

test('calendarStatusMessage lists microsoft provider', () => {
  const msg = calendarStatusMessage(['microsoft'])
  assert.ok(msg.includes('Outlook Calendar'))
})
