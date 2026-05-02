import assert from 'node:assert/strict'
import { test } from 'node:test'

// Run with: INTEGRATION_TEST=true node --import tsx --test tests/integration/calendar.test.ts
// Requires calendar-service running (docker compose up calendar-service)
// GOOGLE_CLIENT_ID must be set in calendar-service env for auth-url tests
const RUN = process.env.INTEGRATION_TEST === 'true'
const BASE = process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002'
const SKIP = RUN ? undefined : 'set INTEGRATION_TEST=true and start calendar-service'

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`)
  return { status: r.status, body: (await r.json()) as Record<string, unknown> }
}

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: (await r.json()) as Record<string, unknown> }
}

async function del(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: (await r.json()) as Record<string, unknown> }
}

test('GET /health returns ok', { skip: SKIP }, async () => {
  const { status, body } = await get('/health')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
})

test('GET /connections requires telegramUserId param', { skip: SKIP }, async () => {
  const { status } = await get('/connections')
  assert.equal(status, 400)
})

test('GET /connections returns empty array for new user', { skip: SKIP }, async () => {
  const { status, body } = await get('/connections?telegramUserId=987654321')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
  assert.equal((body as unknown[]).length, 0)
})

test('POST /auth-url returns google auth URL when GOOGLE_CLIENT_ID set', { skip: SKIP }, async () => {
  const { status, body } = await post('/auth-url', {
    provider: 'google',
    telegramUserId: 123,
    scope: 'user',
  })

  if (status === 400) {
    // google not configured in this env — acceptable
    assert.ok((body.error as string).includes('not configured'))
    return
  }

  assert.equal(status, 200)
  assert.ok(typeof body.url === 'string')
  assert.ok((body.url as string).startsWith('https://accounts.google.com'))
})

test('POST /auth-url for unknown provider returns 400', { skip: SKIP }, async () => {
  const { status } = await post('/auth-url', {
    provider: 'unsupported-provider',
    telegramUserId: 123,
    scope: 'user',
  })
  assert.equal(status, 400)
})

test('DELETE /connections for user with no connections returns 200', { skip: SKIP }, async () => {
  const { status } = await del('/connections', {
    provider: 'google',
    telegramUserId: 987654321,
  })
  assert.equal(status, 200)
})

test('GET /connections with scope filter returns only matching scope', { skip: SKIP }, async () => {
  const { status, body } = await get('/connections?telegramUserId=987654321&scope=user')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
  for (const conn of body as { scope: string }[]) {
    assert.equal(conn.scope, 'user')
  }
})
