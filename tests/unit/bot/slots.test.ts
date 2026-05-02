import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSlots } from '../../../apps/bot/services/booking-service/src/slots.js'

test('createSlots returns 3 slots for any resourceId', () => {
  const slots = createSlots('r-abc')
  assert.equal(slots.length, 3)
})

test('slot ids are prefixed with resourceId', () => {
  const slots = createSlots('desk-1')
  for (const slot of slots) {
    assert.ok(slot.id.startsWith('desk-1'), `slot id "${slot.id}" should start with "desk-1"`)
  }
})

test('slots have unique ids', () => {
  const slots = createSlots('r1')
  const ids = slots.map((s) => s.id)
  assert.equal(new Set(ids).size, 3)
})

test('morning slot starts at 09:00', () => {
  const [morning] = createSlots('r1')
  const start = new Date(morning.startsAtIso)
  assert.equal(start.getHours(), 9)
})

test('morning slot ends at 12:00', () => {
  const [morning] = createSlots('r1')
  const end = new Date(morning.endsAtIso)
  assert.equal(end.getHours(), 12)
})

test('afternoon slot starts at 13:00', () => {
  const [, afternoon] = createSlots('r1')
  const start = new Date(afternoon.startsAtIso)
  assert.equal(start.getHours(), 13)
})

test('afternoon slot ends at 17:00', () => {
  const [, afternoon] = createSlots('r1')
  const end = new Date(afternoon.endsAtIso)
  assert.equal(end.getHours(), 17)
})

test('evening slot starts at 18:00', () => {
  const [, , evening] = createSlots('r1')
  const start = new Date(evening.startsAtIso)
  assert.equal(start.getHours(), 18)
})

test('evening slot ends at 21:00', () => {
  const [, , evening] = createSlots('r1')
  const end = new Date(evening.endsAtIso)
  assert.equal(end.getHours(), 21)
})

test('all slot ISO times are valid dates', () => {
  const slots = createSlots('r1')
  for (const slot of slots) {
    assert.ok(!Number.isNaN(Date.parse(slot.startsAtIso)), `startsAtIso "${slot.startsAtIso}" is not a valid date`)
    assert.ok(!Number.isNaN(Date.parse(slot.endsAtIso)), `endsAtIso "${slot.endsAtIso}" is not a valid date`)
  }
})

test('each slot end is after its start', () => {
  const slots = createSlots('r1')
  for (const slot of slots) {
    assert.ok(new Date(slot.endsAtIso) > new Date(slot.startsAtIso))
  }
})

test('slots do not overlap each other', () => {
  const [morning, afternoon, evening] = createSlots('r1')
  assert.ok(new Date(morning.endsAtIso) <= new Date(afternoon.startsAtIso))
  assert.ok(new Date(afternoon.endsAtIso) <= new Date(evening.startsAtIso))
})

test('human-readable startsAt and endsAt are non-empty strings', () => {
  const slots = createSlots('r1')
  for (const slot of slots) {
    assert.ok(typeof slot.startsAt === 'string' && slot.startsAt.length > 0)
    assert.ok(typeof slot.endsAt === 'string' && slot.endsAt.length > 0)
  }
})
