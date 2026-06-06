import assert from 'node:assert/strict'
import { test } from 'node:test'

import { serializeBooking, type BookingRecord } from './booking-serialization.js'

// Базовая запись, в которой все «опасные» для JSON поля заданы явно.
// Каждый тест клонирует её и переопределяет только проверяемое поле.
function baseRecord(): BookingRecord {
  return {
    calendarEventGoogle: null,
    calendarEventMicrosoft: null,
    endsAt: '15:00',
    endsAtIso: new Date('2026-06-06T15:00:00.000Z'),
    id: 'bk_1',
    locationId: 'loc_1',
    locationName: 'Downtown',
    paidAmountMinorUnits: 5000,
    priceLabel: '50 RUB',
    resourceId: 'res_1',
    resourceName: 'Room A',
    slotId: 'res_1-20260606-14-1',
    startsAt: '14:00',
    startsAtIso: new Date('2026-06-06T14:00:00.000Z'),
    status: 'active',
    telegramUserId: 123n,
  }
}

test('serializeBooking приводит BigInt telegramUserId к number', () => {
  const result = serializeBooking(baseRecord())

  assert.equal(typeof result.telegramUserId, 'number')
  assert.equal(result.telegramUserId, 123)
})

test('serializeBooking превращает Date в ISO-строку', () => {
  const result = serializeBooking(baseRecord())

  assert.equal(result.startsAtIso, '2026-06-06T14:00:00.000Z')
  assert.equal(result.endsAtIso, '2026-06-06T15:00:00.000Z')
})

test('serializeBooking оставляет уже строковые ISO без изменений', () => {
  const result = serializeBooking({
    ...baseRecord(),
    startsAtIso: '2026-06-06T14:00:00.000Z',
    endsAtIso: '2026-06-06T15:00:00.000Z',
  })

  assert.equal(result.startsAtIso, '2026-06-06T14:00:00.000Z')
  assert.equal(result.endsAtIso, '2026-06-06T15:00:00.000Z')
})

test('serializeBooking превращает null calendar id в undefined', () => {
  const result = serializeBooking(baseRecord())

  assert.equal(result.calendarEventGoogle, undefined)
  assert.equal(result.calendarEventMicrosoft, undefined)
})

test('serializeBooking сохраняет непустые calendar id', () => {
  const result = serializeBooking({
    ...baseRecord(),
    calendarEventGoogle: 'gcal_42',
    calendarEventMicrosoft: 'mcal_42',
  })

  assert.equal(result.calendarEventGoogle, 'gcal_42')
  assert.equal(result.calendarEventMicrosoft, 'mcal_42')
})

test('serializeBooking сохраняет статус как union-значение', () => {
  const result = serializeBooking({ ...baseRecord(), status: 'cancelled' })

  assert.equal(result.status, 'cancelled')
})
