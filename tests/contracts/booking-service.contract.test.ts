/**
 * Contract tests — booking-service
 *
 * Validates that booking-service HTTP responses conform to the shapes
 * defined in @metrix/contracts. These tests run against a live service
 * (locally via docker compose, or on staging in CI).
 *
 * Run locally:
 *   docker compose -f apps/bot/docker-compose.yml up -d booking-service postgres redis pgbouncer db-init
 *   CONTRACT_TEST=true node --import tsx --test tests/contracts/booking-service.contract.test.ts
 *
 * The test does NOT create or mutate data — it only reads existing seed data.
 * Seed data is applied by docker-compose db-init via prisma/seed.ts.
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import {
  assertArray,
  assertBooking,
  assertHealthResponse,
  assertLocation,
  assertReadinessResponse,
  assertResource,
  assertSlot,
} from './schema.js'

const RUN = process.env.CONTRACT_TEST === 'true'
const BASE = (process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const SKIP = RUN ? undefined : 'set CONTRACT_TEST=true to run contract tests (requires booking-service)'

// ── HTTP helpers ───────────────────────────────────────────────────────────

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, body: await res.json() }
}

// ── Runtime contract ───────────────────────────────────────────────────────

describe('booking-service contract', { skip: SKIP }, () => {

  // ── Infrastructure endpoints ─────────────────────────────────────────────

  test('GET /health → { ok: true }', async () => {
    const { status, body } = await get('/health')
    assert.equal(status, 200, `expected 200, got ${status}`)
    assertHealthResponse(body)
  })

  test('GET /ready → 200 with dependency map', async () => {
    const { status, body } = await get('/ready')
    // 200 = all deps healthy; 503 = degraded but still valid contract shape.
    assert.ok(status === 200 || status === 503, `expected 200 or 503, got ${status}`)
    assertReadinessResponse(body)
  })

  // ── Location contract ────────────────────────────────────────────────────

  test('GET /locations → Location[]', async () => {
    const { status, body } = await get('/locations')
    assert.equal(status, 200, `expected 200, got ${status}`)
    assertArray(body, assertLocation, 'locations')
  })

  test('GET /locations returns at least one location (seed data present)', async () => {
    const { body } = await get('/locations')
    assert.ok(Array.isArray(body) && body.length > 0, 'expected seed locations, got empty array')
  })

  // ── Resource contract ────────────────────────────────────────────────────

  test('GET /resources?locationId=<valid> → Resource[]', async () => {
    const { body: locations } = await get('/locations')
    assert.ok(Array.isArray(locations) && locations.length > 0, 'need at least one location to test resources')

    const firstId = (locations as Array<{ id: string }>)[0]!.id
    const { status, body } = await get(`/resources?locationId=${firstId}`)
    assert.equal(status, 200, `expected 200, got ${status}`)
    assertArray(body, assertResource, 'resources')
  })

  test('GET /resources?locationId=nonexistent → 200 empty array', async () => {
    const { status, body } = await get('/resources?locationId=does-not-exist')
    assert.equal(status, 200, `expected 200, got ${status}`)
    assert.ok(Array.isArray(body), 'expected an array for unknown location')
  })

  // ── Slot contract ─────────────────────────────────────────────────────────

  test('GET /slots?resourceId=<valid> → AvailableSlot[]', async () => {
    const { body: locations } = await get('/locations')
    assert.ok(Array.isArray(locations) && locations.length > 0, 'need locations')
    const locId = (locations as Array<{ id: string }>)[0]!.id

    const { body: resources } = await get(`/resources?locationId=${locId}`)
    assert.ok(Array.isArray(resources) && resources.length > 0, 'need resources')
    const resourceId = (resources as Array<{ id: string }>)[0]!.id

    const { status, body } = await get(`/slots?resourceId=${resourceId}`)
    assert.equal(status, 200, `expected 200, got ${status}`)
    assertArray(body, assertSlot, 'slots')
  })

  // ── Error shape contract ──────────────────────────────────────────────────

  test('POST /bookings with missing fields → 400 with error shape', async () => {
    const res = await fetch(`${BASE}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400, `expected 400 for malformed request, got ${res.status}`)
    const body = await res.json() as Record<string, unknown>
    assert.ok(
      typeof body.error === 'string' && body.error.length > 0,
      'error response must have a non-empty "error" string field',
    )
  })

  test('GET /bookings/:id with unknown id → 404 with error shape', async () => {
    const res = await fetch(`${BASE}/bookings/does-not-exist-00000`)
    // Some services return 404, others 401 if auth is required. Either is valid.
    assert.ok(res.status === 404 || res.status === 401, `expected 404 or 401, got ${res.status}`)
    if (res.status === 404) {
      const body = await res.json() as Record<string, unknown>
      assert.ok(
        typeof body.error === 'string',
        '404 response must have an "error" string field',
      )
    }
  })

  // ── Booking response shape (if a booking exists in seed data) ─────────────

  test('bookings returned by list endpoint match Booking contract', async () => {
    // We need a valid auth token to list bookings — skip if none provided.
    const authToken = process.env.CONTRACT_TEST_AUTH_TOKEN
    if (!authToken) {
      console.log('  [skip] set CONTRACT_TEST_AUTH_TOKEN to test booking list shape')
      return
    }

    const res = await fetch(`${BASE}/bookings`, {
      headers: { authorization: `Bearer ${authToken}` },
    })

    if (res.status === 200) {
      const body = await res.json()
      assertArray(body, assertBooking, 'bookings')
    }
  })
})
