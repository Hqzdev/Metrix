import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RedisTelegramUpdateStore } from '../../../apps/bot/services/bot-gateway/src/telegram-update-store.js'

test('telegram update store claims update once and keeps offset monotonic', async () => {
  const redis = new FakeRedis()
  const store = new RedisTelegramUpdateStore(redis as never)

  assert.equal(await store.claimUpdate(100), true)
  assert.equal(await store.claimUpdate(100), false)

  assert.equal(await store.readOffset(), undefined)

  await store.saveOffset(101)
  assert.equal(await store.readOffset(), 101)

  await store.saveOffset(99)
  assert.equal(await store.readOffset(), 101)

  await store.saveOffset(102)
  assert.equal(await store.readOffset(), 102)
})

class FakeRedis {
  private readonly values = new Map<string, string>()

  async set(key: string, value: string, ...args: string[]): Promise<'OK' | null> {
    if (args.includes('NX') && this.values.has(key)) return null
    this.values.set(key, value)
    return 'OK'
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async eval(_script: string, _keyCount: number, key: string, value: string): Promise<number> {
    const current = this.values.get(key)
    if (!current || Number(current) < Number(value)) {
      this.values.set(key, value)
      return 1
    }
    return 0
  }
}
