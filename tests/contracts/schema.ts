/**
 * Runtime schema validators for @metrix/contracts types.
 *
 * Why: TypeScript types are erased at runtime. When booking-service responds
 * with { id: 123 } instead of { id: "abc-..." }, TypeScript won't catch it —
 * but a contract test calling assertBooking() will.
 *
 * These validators mirror the types in apps/bot/packages/contracts/src/*.ts
 * exactly. Any drift between this file and the contracts package means the
 * service is violating its own published contract.
 *
 * Usage:
 *   const body = await res.json()
 *   assertBooking(body)           // throws AssertionError if shape is wrong
 *   assertArray(body, assertBooking) // validates an array of bookings
 */

import assert from 'node:assert/strict'

// ── Primitive helpers ──────────────────────────────────────────────────────

export function assertString(value: unknown, field: string): asserts value is string {
  assert.equal(typeof value, 'string', `${field} must be a string, got ${typeof value}`)
  assert.ok((value as string).length > 0, `${field} must not be empty`)
}

export function assertOptionalString(value: unknown, field: string): void {
  if (value !== undefined) assertString(value, field)
}

export function assertNumber(value: unknown, field: string): asserts value is number {
  assert.equal(typeof value, 'number', `${field} must be a number, got ${typeof value}`)
  assert.ok(Number.isFinite(value as number), `${field} must be finite`)
}

export function assertObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${field} must be a plain object`,
  )
}

export function assertArray<T>(
  value: unknown,
  itemAssertion: (item: unknown, index: string) => asserts item is T,
  field = 'response',
): asserts value is T[] {
  assert.ok(Array.isArray(value), `${field} must be an array`)
  ;(value as unknown[]).forEach((item, i) => itemAssertion(item, `${field}[${i}]`))
}

// ── Booking contract ───────────────────────────────────────────────────────

const BOOKING_STATUSES = ['active', 'cancelled', 'completed', 'rescheduled'] as const

export function assertBooking(value: unknown, field = 'booking'): void {
  assertObject(value, field)
  const b = value as Record<string, unknown>

  assertString(b.id, `${field}.id`)
  assertString(b.locationId, `${field}.locationId`)
  assertString(b.locationName, `${field}.locationName`)
  assertString(b.resourceId, `${field}.resourceId`)
  assertString(b.resourceName, `${field}.resourceName`)
  assertString(b.slotId, `${field}.slotId`)
  assertNumber(b.telegramUserId, `${field}.telegramUserId`)
  assertNumber(b.paidAmountMinorUnits, `${field}.paidAmountMinorUnits`)
  assertString(b.priceLabel, `${field}.priceLabel`)
  assertString(b.startsAt, `${field}.startsAt`)
  assertString(b.startsAtIso, `${field}.startsAtIso`)
  assertString(b.endsAt, `${field}.endsAt`)
  assertString(b.endsAtIso, `${field}.endsAtIso`)

  assert.ok(
    BOOKING_STATUSES.includes(b.status as (typeof BOOKING_STATUSES)[number]),
    `${field}.status must be one of ${BOOKING_STATUSES.join(', ')}, got ${String(b.status)}`,
  )

  assertOptionalString(b.calendarEventGoogle, `${field}.calendarEventGoogle`)
  assertOptionalString(b.calendarEventMicrosoft, `${field}.calendarEventMicrosoft`)
}

// ── Location contract ──────────────────────────────────────────────────────

export function assertLocation(value: unknown, field = 'location'): void {
  assertObject(value, field)
  const l = value as Record<string, unknown>

  assertString(l.id, `${field}.id`)
  assertString(l.name, `${field}.name`)
  assertString(l.city, `${field}.city`)
  assertString(l.address, `${field}.address`)
  assertString(l.occupancy, `${field}.occupancy`)
  assertString(l.members, `${field}.members`)
}

// ── Resource contract ──────────────────────────────────────────────────────

export function assertResource(value: unknown, field = 'resource'): void {
  assertObject(value, field)
  const r = value as Record<string, unknown>

  assertString(r.id, `${field}.id`)
  assertString(r.locationId, `${field}.locationId`)
  assertString(r.name, `${field}.name`)
  assertString(r.type, `${field}.type`)
  assertString(r.seats, `${field}.seats`)
  assertString(r.occupancy, `${field}.occupancy`)
  assertString(r.priceLabel, `${field}.priceLabel`)
  assertNumber(r.priceMinorUnits, `${field}.priceMinorUnits`)
  assertString(r.status, `${field}.status`)
}

// ── Slot contract ──────────────────────────────────────────────────────────

export function assertSlot(value: unknown, field = 'slot'): void {
  assertObject(value, field)
  const s = value as Record<string, unknown>

  assertString(s.id, `${field}.id`)
  assertString(s.startsAt, `${field}.startsAt`)
  assertString(s.startsAtIso, `${field}.startsAtIso`)
  assertString(s.endsAt, `${field}.endsAt`)
  assertString(s.endsAtIso, `${field}.endsAtIso`)

  // startsAtIso must be a valid ISO 8601 date string.
  assert.ok(
    !Number.isNaN(Date.parse(s.startsAtIso as string)),
    `${field}.startsAtIso must be a valid ISO 8601 date string`,
  )
}

// ── Health / readiness ─────────────────────────────────────────────────────

export function assertHealthResponse(value: unknown, field = 'health'): void {
  assertObject(value, field)
  const h = value as Record<string, unknown>
  assert.equal(h.ok, true, `${field}.ok must be true`)
}

export function assertReadinessResponse(value: unknown, field = 'readiness'): void {
  assertObject(value, field)
  // Readiness response must have at least one dependency key.
  assert.ok(Object.keys(value as object).length > 0, `${field} must list at least one dependency`)
}
