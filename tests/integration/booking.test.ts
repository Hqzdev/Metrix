import assert from 'node:assert/strict'
import { test } from 'node:test'

// Run with: INTEGRATION_TEST=true node --import tsx --test tests/integration/booking.test.ts
// Requires booking-service running (docker compose up booking-service)
const RUN = process.env.INTEGRATION_TEST === 'true'
const BASE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const SKIP = RUN ? undefined : 'set INTEGRATION_TEST=true and start booking-service'

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`)
  return { status: r.status, body: await r.json() }
}

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json() }
}

async function patch(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json() }
}

test('GET /health returns ok', { skip: SKIP }, async () => {
  const { status, body } = await get('/health')
  assert.equal(status, 200)
  assert.equal((body as { ok: boolean }).ok, true)
})

test('GET /locations returns array', { skip: SKIP }, async () => {
  const { status, body } = await get('/locations')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
})

test('GET /resources?locationId= returns array for valid location', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const firstId = (locations as { id: string }[])[0]?.id
  if (!firstId) return

  const { status, body } = await get(`/resources?locationId=${firstId}`)
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
})

test('GET /slots?resourceId= returns slot array', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const locId = (locations as { id: string }[])[0]?.id
  if (!locId) return

  const { body: resources } = await get(`/resources?locationId=${locId}`)
  const resId = (resources as { id: string }[])[0]?.id
  if (!resId) return

  const { status, body } = await get(`/slots?resourceId=${resId}`)
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
})

test('POST /bookings creates booking and returns it', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const locId = (locations as { id: string }[])[0]?.id
  if (!locId) return

  const { body: resources } = await get(`/resources?locationId=${locId}`)
  const resource = (resources as { id: string }[])[0]
  if (!resource) return

  const { body: slots } = await get(`/slots?resourceId=${resource.id}`)
  const slot = (slots as { id: string }[])[0]
  if (!slot) return

  const { status, body } = await post('/bookings', {
    telegramUserId: 999001,
    resourceId: resource.id,
    slotId: slot.id,
  })
  assert.equal(status, 201)
  assert.equal((body as { status: string }).status, 'active')
})

test('GET /bookings?telegramUserId= returns user bookings', { skip: SKIP }, async () => {
  const { status, body } = await get('/bookings?telegramUserId=999001')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
  for (const b of body as { telegramUserId: number }[]) {
    assert.equal(b.telegramUserId, 999001)
  }
})

test('PATCH /bookings/:id with status=cancelled cancels the booking', { skip: SKIP }, async () => {
  const { body: bookings } = await get('/bookings?telegramUserId=999001')
  const booking = (bookings as { id: string; status: string }[]).find((b) => b.status === 'active')
  if (!booking) return

  const { status, body } = await patch(`/bookings/${booking.id}`, { status: 'cancelled' })
  assert.equal(status, 200)
  assert.equal((body as { status: string }).status, 'cancelled')
})

test('GET /resources/:id returns single resource', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const locId = (locations as { id: string }[])[0]?.id
  if (!locId) return

  const { body: resources } = await get(`/resources?locationId=${locId}`)
  const resource = (resources as { id: string }[])[0]
  if (!resource) return

  const { status, body } = await get(`/resources/${resource.id}`)
  assert.equal(status, 200)
  assert.equal((body as { id: string }).id, resource.id)
})

test('concurrent booking of the same slot — both requests complete without crash', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const locId = (locations as { id: string }[])[0]?.id
  if (!locId) return

  const { body: resources } = await get(`/resources?locationId=${locId}`)
  const resource = (resources as { id: string }[])[0]
  if (!resource) return

  const { body: slots } = await get(`/slots?resourceId=${resource.id}`)
  const slot = (slots as { id: string }[])[0]
  if (!slot) return

  // fire two concurrent POST /bookings for the same slot from different users
  const [r1, r2] = await Promise.all([
    post('/bookings', { telegramUserId: 999002, resourceId: resource.id, slotId: slot.id }),
    post('/bookings', { telegramUserId: 999003, resourceId: resource.id, slotId: slot.id }),
  ])

  // both requests must return a valid HTTP response (no 500)
  assert.ok(r1.status < 500, `request 1 returned ${r1.status}`)
  assert.ok(r2.status < 500, `request 2 returned ${r2.status}`)

  // at least one must succeed
  const successes = [r1, r2].filter((r) => r.status === 201).length
  assert.ok(successes >= 1, 'at least one concurrent booking should succeed')
})

test('PATCH /locations/:id updates occupancy', { skip: SKIP }, async () => {
  const { body: locations } = await get('/locations')
  const location = (locations as { id: string }[])[0]
  if (!location) return

  const { status, body } = await patch(`/locations/${location.id}`, { occupancy: '80%' })
  assert.equal(status, 200)
  assert.equal((body as { occupancy: string }).occupancy, '80%')
})
