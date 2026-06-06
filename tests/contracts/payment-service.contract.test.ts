/**
 * Contract tests — payment-service
 *
 * Run locally:
 *   docker compose -f apps/bot/docker-compose.yml up -d payment-service booking-service postgres redis pgbouncer db-init
 *   CONTRACT_TEST=true node --import tsx --test tests/contracts/payment-service.contract.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { assertHealthResponse, assertObject, assertReadinessResponse } from './schema.js'
import { serviceAuthHeaders } from './auth.js'

const RUN = process.env.CONTRACT_TEST === 'true'
const BASE = (process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003').replace(/\/$/, '')
const SKIP = RUN ? undefined : 'set CONTRACT_TEST=true to run contract tests (requires payment-service)'

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: serviceAuthHeaders('GET', path),
  })
  return { status: res.status, body: await res.json() }
}

async function post(path: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const raw = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, {
    body: raw,
    headers: serviceAuthHeaders('POST', path, raw),
    method: 'POST',
  })
  return { status: res.status, body: await res.json() }
}

describe('payment-service contract', { skip: SKIP }, () => {

  test('GET /health → { ok: true }', async () => {
    const { status, body } = await get('/health')
    assert.equal(status, 200, `expected 200, got ${status}`)
    assertHealthResponse(body)
  })

  test('GET /ready → 200 or 503 with dependency map', async () => {
    const { status, body } = await get('/ready')
    assert.ok(status === 200 || status === 503, `expected 200 or 503, got ${status}`)
    assertReadinessResponse(body)
  })

  // ── Invoice creation error shape ──────────────────────────────────────────

  test('POST /invoices with missing fields → 400 with error shape', async () => {
    const { status, body } = await post('/invoices', {})
    assert.equal(status, 400, `expected 400 for empty invoice request, got ${status}`)
    assertObject(body, 'error response')
    assert.ok(
      typeof body.error === 'string' && body.error.length > 0,
      'error response must have a non-empty "error" string field',
    )
  })

  // ── Unknown route ─────────────────────────────────────────────────────────

  test('GET /nonexistent → 404 with error shape', async () => {
    const { status } = await get('/this-route-does-not-exist')
    assert.equal(status, 404, `expected 404 for unknown route, got ${status}`)
  })
})
