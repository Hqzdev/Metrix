import assert from 'node:assert/strict'
import { test } from 'node:test'

// Run with: INTEGRATION_TEST=true node --import tsx --test tests/integration/payment.test.ts
// Requires payment-service + booking-service + redis running (docker compose up)
const RUN = process.env.INTEGRATION_TEST === 'true'
const PAY_BASE = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003'
const SKIP = RUN ? undefined : 'set INTEGRATION_TEST=true and start payment-service'

async function post(base: string, path: string, body: unknown) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: (await r.json()) as Record<string, unknown> }
}

test('GET /health returns ok', { skip: SKIP }, async () => {
  const r = await fetch(`${PAY_BASE}/health`)
  const body = (await r.json()) as { ok: boolean }
  assert.equal(r.status, 200)
  assert.equal(body.ok, true)
})

test('POST /invoices with unknown resourceId returns 404', { skip: SKIP }, async () => {
  const { status } = await post(PAY_BASE, '/invoices', {
    chatId: 100,
    messageId: 1,
    telegramUserId: 999,
    resourceId: 'nonexistent-resource',
    slotId: 'nonexistent-slot',
  })
  assert.equal(status, 404)
})

test('POST /pre-checkout rejects when invoice not found', { skip: SKIP }, async () => {
  const { status, body } = await post(PAY_BASE, '/pre-checkout', {
    query: {
      id: 'pq-999',
      from: { id: 999 },
      currency: 'RUB',
      total_amount: 100000,
      invoice_payload: 'nonexistent-invoice-id',
    },
  })
  assert.equal(status, 200)
  assert.equal(body.ok, false)
})

test('POST /pre-checkout rejects when telegramUserId does not match', { skip: SKIP }, async () => {
  // create a real invoice first
  const BOOK_BASE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
  const locRes = await fetch(`${BOOK_BASE}/locations`)
  const locations = (await locRes.json()) as { id: string }[]
  if (locations.length === 0) return

  const resRes = await fetch(`${BOOK_BASE}/resources?locationId=${locations[0].id}`)
  const resources = (await resRes.json()) as { id: string; priceMinorUnits: number }[]
  if (resources.length === 0) return

  const slotsRes = await fetch(`${BOOK_BASE}/slots?resourceId=${resources[0].id}`)
  const slots = (await slotsRes.json()) as { id: string }[]
  if (slots.length === 0) return

  const inv = await post(PAY_BASE, '/invoices', {
    chatId: 100,
    messageId: 1,
    telegramUserId: 888,
    resourceId: resources[0].id,
    slotId: slots[0].id,
  })
  assert.equal(inv.status, 201)
  const invoiceId = inv.body.invoiceId as string

  // try pre-checkout from a different user
  const { body } = await post(PAY_BASE, '/pre-checkout', {
    query: {
      id: 'pq-001',
      from: { id: 777 }, // wrong user
      currency: 'RUB',
      total_amount: resources[0].priceMinorUnits,
      invoice_payload: invoiceId,
    },
  })
  assert.equal(body.ok, false)
})

test('POST /pre-checkout rejects when amount mismatches', { skip: SKIP }, async () => {
  const BOOK_BASE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
  const locRes = await fetch(`${BOOK_BASE}/locations`)
  const locations = (await locRes.json()) as { id: string }[]
  if (locations.length === 0) return

  const resRes = await fetch(`${BOOK_BASE}/resources?locationId=${locations[0].id}`)
  const resources = (await resRes.json()) as { id: string; priceMinorUnits: number }[]
  if (resources.length === 0) return

  const slotsRes = await fetch(`${BOOK_BASE}/slots?resourceId=${resources[0].id}`)
  const slots = (await slotsRes.json()) as { id: string }[]
  if (slots.length === 0) return

  const inv = await post(PAY_BASE, '/invoices', {
    chatId: 100,
    messageId: 1,
    telegramUserId: 555,
    resourceId: resources[0].id,
    slotId: slots[0].id,
  })
  assert.equal(inv.status, 201)
  const invoiceId = inv.body.invoiceId as string

  const { body } = await post(PAY_BASE, '/pre-checkout', {
    query: {
      id: 'pq-002',
      from: { id: 555 },
      currency: 'RUB',
      total_amount: 1, // wrong amount
      invoice_payload: invoiceId,
    },
  })
  assert.equal(body.ok, false)
})

test('POST /pre-checkout approves valid invoice with correct user and amount', { skip: SKIP }, async () => {
  const BOOK_BASE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
  const locRes = await fetch(`${BOOK_BASE}/locations`)
  const locations = (await locRes.json()) as { id: string }[]
  if (locations.length === 0) return

  const resRes = await fetch(`${BOOK_BASE}/resources?locationId=${locations[0].id}`)
  const resources = (await resRes.json()) as { id: string; priceMinorUnits: number }[]
  if (resources.length === 0) return

  const slotsRes = await fetch(`${BOOK_BASE}/slots?resourceId=${resources[0].id}`)
  const slots = (await slotsRes.json()) as { id: string }[]
  if (slots.length === 0) return

  const inv = await post(PAY_BASE, '/invoices', {
    chatId: 100,
    messageId: 1,
    telegramUserId: 444,
    resourceId: resources[0].id,
    slotId: slots[0].id,
  })
  assert.equal(inv.status, 201)
  const invoiceId = inv.body.invoiceId as string
  const expectedAmount = Math.min(9_900_000, resources[0].priceMinorUnits)

  const { body } = await post(PAY_BASE, '/pre-checkout', {
    query: {
      id: 'pq-003',
      from: { id: 444 },
      currency: 'RUB',
      total_amount: expectedAmount,
      invoice_payload: invoiceId,
    },
  })
  assert.equal(body.ok, true)
})
