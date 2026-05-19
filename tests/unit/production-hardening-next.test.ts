import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('booking creation keeps anti-race protection at lock, transaction and database levels', async () => {
  const router = await readFile('apps/bot/services/booking-service/src/booking-router.ts', 'utf8')
  const migration = await readFile('apps/bot/prisma/migrations/20260519_production_hardening.sql', 'utf8')

  assert.match(router, /slotLocker\.acquire/)
  assert.match(router, /prisma\.\$transaction/)
  assert.match(router, /code === 'P2002'/)
  assert.match(migration, /Booking_active_slot_unique/)
  assert.match(migration, /WHERE status = 'active'/)
})

test('bot-gateway records duplicate update metrics and can recover FSM UI', async () => {
  const bot = await readFile('apps/bot/services/bot-gateway/src/bot.ts', 'utf8')
  const telegramClient = await readFile('apps/bot/services/bot-gateway/src/telegram-client.ts', 'utf8')

  assert.match(bot, /metrix_telegram_duplicate_updates_total/)
  assert.match(bot, /sendRecoveredSession/)
  assert.match(bot, /sessionStore\.getState/)
  assert.match(telegramClient, /command: 'resume'/)
})

test('admin-service exposes operator queues for DLQ and PaymentSaga recovery', async () => {
  const router = await readFile('apps/bot/services/admin-service/src/admin-router.ts', 'utf8')

  assert.match(router, /path === '\/dlq\/streams'/)
  assert.match(router, /listDlqStreams/)
  assert.match(router, /path === '\/payment-sagas'/)
  assert.match(router, /listPaymentSagas/)
  assert.match(router, /parseAuditCursor/)
  assert.match(router, /nextCursor/)
})

test('observability supports custom counters and traceparent propagation', async () => {
  const observability = await readFile('apps/bot/packages/observability/src/index.ts', 'utf8')
  const auth = await readFile('apps/bot/packages/auth/src/index.ts', 'utf8')

  assert.match(observability, /incrementCounter/)
  assert.match(auth, /traceparent/)
  assert.match(auth, /createTraceparent/)
  assert.match(auth, /readTraceparent/)
})
