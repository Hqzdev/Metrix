/**
 * Contract tests — calendar-service
 *
 * Run locally:
 *   docker compose -f apps/bot/docker-compose.yml up -d calendar-service postgres redis pgbouncer db-init
 *   CONTRACT_TEST=true node --import tsx --test tests/contracts/calendar-service.contract.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { assertHealthResponse, assertObject, assertReadinessResponse } from './schema.js'

const RUN = process.env.CONTRACT_TEST === 'true'
const BASE = (process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002').replace(/\/$/, '')
const SKIP = RUN ? undefined : 'set CONTRACT_TEST=true to run contract tests (requires calendar-service)'

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, body: await res.json() }
}

describe('calendar-service contract', { skip: SKIP }, () => {

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

  // ── OAuth callback error shape ─────────────────────────────────────────────

  test('GET /oauth/callback without code → 400 with error shape', async () => {
    const res = await fetch(`${BASE}/oauth/callback?provider=google`)
    // Expect a 4xx — the exact code depends on whether the service validates
    // the required `code` param. Either 400 or 401 is acceptable.
    assert.ok(
      res.status >= 400 && res.status < 500,
      `expected 4xx for missing OAuth code, got ${res.status}`,
    )
    const body = await res.json() as Record<string, unknown>
    assertObject(body, 'error response')
    assert.ok(
      typeof body.error === 'string' && body.error.length > 0,
      'error response must have a non-empty "error" string field',
    )
  })
})
