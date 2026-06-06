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
import { serviceAuthHeaders } from './auth.js'

const RUN = process.env.CONTRACT_TEST === 'true'
const BASE = (process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002').replace(/\/$/, '')
const SKIP = RUN ? undefined : 'set CONTRACT_TEST=true to run contract tests (requires calendar-service)'

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

  test('POST /oauth-callback without code → 400 with error shape', async () => {
    const { status, body } = await post('/oauth-callback', {})
    assert.equal(status, 400, `expected 400 for missing OAuth code, got ${status}`)
    assertObject(body, 'error response')
    assert.ok(
      typeof body.error === 'string' && body.error.length > 0,
      'error response must have a non-empty "error" string field',
    )
  })
})
