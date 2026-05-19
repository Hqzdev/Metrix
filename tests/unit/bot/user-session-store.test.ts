import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RedisUserSessionStore } from '../../../apps/bot/services/bot-gateway/src/user-session-store.js'

test('user session store persists FSM state with TTL', async () => {
  const redis = new FakeRedis()
  const store = new RedisUserSessionStore(redis as never)

  await store.setState(42, {
    locationId: 'loc-1',
    resourceId: 'room-1',
    slotId: 'room-1m',
    state: 'CONFIRM_BOOKING',
  })

  assert.equal(redis.lastKey, 'telegram:session:42')
  assert.equal(redis.lastMode, 'EX')
  assert.equal(redis.lastTtl, 3600)

  const payload = JSON.parse(redis.lastValue)
  assert.equal(payload.state, 'CONFIRM_BOOKING')
  assert.equal(payload.locationId, 'loc-1')
  assert.equal(payload.resourceId, 'room-1')
  assert.equal(payload.slotId, 'room-1m')
  assert.equal(typeof payload.updatedAt, 'string')
  assert.equal(payload.version, 1)

  const stored = await store.getState(42)
  assert.equal(stored?.state, 'CONFIRM_BOOKING')
  assert.equal(stored?.version, 1)
})

test('user session store rejects stale optimistic version', async () => {
  const redis = new FakeRedis()
  const store = new RedisUserSessionStore(redis as never)

  await store.setState(42, { state: 'SELECT_LOCATION' })
  await store.setState(42, { expectedVersion: 1, locationId: 'loc-1', state: 'SELECT_ROOM' })

  await assert.rejects(
    () => store.setState(42, { expectedVersion: 1, state: 'START' }),
    /version conflict/,
  )

  const stored = await store.getState(42)
  assert.equal(stored?.state, 'SELECT_ROOM')
  assert.equal(stored?.version, 2)
})

class FakeRedis {
  private readonly values = new Map<string, string>()
  lastKey = ''
  lastValue = ''
  lastMode = ''
  lastTtl = 0

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string, mode: string, ttl: number): Promise<'OK'> {
    this.lastKey = key
    this.lastValue = value
    this.lastMode = mode
    this.lastTtl = ttl
    this.values.set(key, value)
    return 'OK'
  }

  async eval(_script: string, _keyCount: number, key: string, payload: string, ttl: string, expectedVersion: string): Promise<number> {
    const current = this.values.get(key)
    if (expectedVersion !== '') {
      if (!current) return 0
      const currentData = JSON.parse(current)
      if (currentData.version !== Number(expectedVersion)) return 0
    }

    const nextData = JSON.parse(payload)
    nextData.version = current ? JSON.parse(current).version + 1 : 1
    const value = JSON.stringify(nextData)
    await this.set(key, value, 'EX', Number(ttl))
    return 1
  }
}
