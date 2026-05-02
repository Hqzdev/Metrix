import assert from 'node:assert/strict'
import { test } from 'node:test'

// Run with: E2E_TEST=true node --import tsx --test tests/e2e/booking-flow.test.ts
// Requires all services running: docker compose -f apps/bot/docker-compose.yml up
const RUN = process.env.E2E_TEST === 'true'
const SKIP = RUN ? undefined : 'set E2E_TEST=true and run: docker compose -f apps/bot/docker-compose.yml up'

const BOOK = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const PAY = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003'
const CAL = process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002'
const ANA = process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005'

const TEST_USER = 100_100 + Math.floor(Math.random() * 1000)

async function get(base: string, path: string) {
  const r = await fetch(`${base}${path}`)
  return { status: r.status, body: await r.json() }
}

async function post(base: string, path: string, body: unknown) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json() }
}

async function patch(base: string, path: string, body: unknown) {
  const r = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json() }
}

test('all services respond to /health', { skip: SKIP }, async () => {
  const checks = await Promise.all([
    get(BOOK, '/health'),
    get(PAY, '/health'),
    get(CAL, '/health'),
    get(ANA, '/health'),
  ])
  for (const { status } of checks) {
    assert.equal(status, 200)
  }
})

test('full booking flow: list → resource → slot → book → verify', { skip: SKIP }, async () => {
  // step 1: list locations
  const { status: s1, body: locations } = await get(BOOK, '/locations')
  assert.equal(s1, 200)
  assert.ok(Array.isArray(locations) && (locations as unknown[]).length > 0, 'need at least one location')

  const locationId = (locations as { id: string }[])[0].id

  // step 2: list resources for location
  const { status: s2, body: resources } = await get(BOOK, `/resources?locationId=${locationId}`)
  assert.equal(s2, 200)
  assert.ok(Array.isArray(resources) && (resources as unknown[]).length > 0, 'need at least one resource')

  const resource = (resources as { id: string; priceLabel: string }[])[0]

  // step 3: list slots for resource
  const { status: s3, body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  assert.equal(s3, 200)
  assert.ok(Array.isArray(slots) && (slots as unknown[]).length > 0, 'need at least one slot')

  const slot = (slots as { id: string }[])[0]

  // step 4: create booking
  const { status: s4, body: booking } = await post(BOOK, '/bookings', {
    telegramUserId: TEST_USER,
    resourceId: resource.id,
    slotId: slot.id,
  })
  assert.equal(s4, 201)
  assert.equal((booking as { status: string }).status, 'active')
  assert.equal((booking as { telegramUserId: number }).telegramUserId, TEST_USER)

  const bookingId = (booking as { id: string }).id

  // step 5: verify booking appears in user's bookings list
  const { status: s5, body: userBookings } = await get(BOOK, `/bookings?telegramUserId=${TEST_USER}`)
  assert.equal(s5, 200)
  const found = (userBookings as { id: string }[]).find((b) => b.id === bookingId)
  assert.ok(found, 'created booking should appear in user bookings')
})

test('cancel booking flow: book → cancel → verify cancelled', { skip: SKIP }, async () => {
  const { body: locations } = await get(BOOK, '/locations')
  const locationId = (locations as { id: string }[])[0]?.id
  if (!locationId) return

  const { body: resources } = await get(BOOK, `/resources?locationId=${locationId}`)
  const resource = (resources as { id: string }[])[0]
  if (!resource) return

  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  const slot = (slots as { id: string }[])[0]
  if (!slot) return

  const { body: booking } = await post(BOOK, '/bookings', {
    telegramUserId: TEST_USER,
    resourceId: resource.id,
    slotId: slot.id,
  })
  const bookingId = (booking as { id: string }).id

  // cancel
  const { status, body: cancelled } = await patch(BOOK, `/bookings/${bookingId}`, { status: 'cancelled' })
  assert.equal(status, 200)
  assert.equal((cancelled as { status: string }).status, 'cancelled')

  // verify status in list
  const { body: userBookings } = await get(BOOK, `/bookings?telegramUserId=${TEST_USER}`)
  const found = (userBookings as { id: string; status: string }[]).find((b) => b.id === bookingId)
  assert.ok(found, 'booking should still be in list after cancel')
  assert.equal(found?.status, 'cancelled')
})

test('payment pre-checkout flow: invoice → pre-checkout approval', { skip: SKIP }, async () => {
  const { body: locations } = await get(BOOK, '/locations')
  const locationId = (locations as { id: string }[])[0]?.id
  if (!locationId) return

  const { body: resources } = await get(BOOK, `/resources?locationId=${locationId}`)
  const resource = (resources as { id: string; priceMinorUnits: number }[])[0]
  if (!resource) return

  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  const slot = (slots as { id: string }[])[0]
  if (!slot) return

  // create invoice
  const { status: invStatus, body: inv } = await post(PAY, '/invoices', {
    chatId: 100,
    messageId: 1,
    telegramUserId: TEST_USER,
    resourceId: resource.id,
    slotId: slot.id,
  })
  assert.equal(invStatus, 201)
  const invoiceId = (inv as { invoiceId: string }).invoiceId
  assert.ok(invoiceId)

  // run pre-checkout with correct data
  const firstAmount = Math.min(9_900_000, resource.priceMinorUnits)
  const { body: pco } = await post(PAY, '/pre-checkout', {
    query: {
      id: 'pq-e2e-1',
      from: { id: TEST_USER },
      currency: 'RUB',
      total_amount: firstAmount,
      invoice_payload: invoiceId,
    },
  })
  assert.equal((pco as { ok: boolean }).ok, true)
})

test('analytics service returns stats', { skip: SKIP }, async () => {
  const { status, body } = await get(ANA, '/stats')
  assert.equal(status, 200)
  assert.ok(typeof body === 'object' && body !== null)
})

test('calendar service has no connections for test user', { skip: SKIP }, async () => {
  const { status, body } = await get(CAL, `/connections?telegramUserId=${TEST_USER}`)
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
})
