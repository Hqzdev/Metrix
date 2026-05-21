import assert from 'node:assert/strict'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { test } from 'node:test'

// ─── setup ────────────────────────────────────────────────────────────────────
//
// Run with:
//   E2E_TEST=true node --import tsx --test tests/e2e/booking-flow.test.ts
//
// Requires all services running:
//   docker compose -f apps/bot/docker-compose.yml up
//
// Optional env overrides:
//   BOOKING_SERVICE_URL   (default: http://localhost:3001)
//   PAYMENT_SERVICE_URL   (default: http://localhost:3003)
//   CALENDAR_SERVICE_URL  (default: http://localhost:3002)
//   ANALYTICS_SERVICE_URL (default: http://localhost:3005)
//   SERVICE_SIGNING_SECRET (default: dev-secret — must match docker-compose)

const RUN = process.env.E2E_TEST === 'true'
const SKIP = RUN ? undefined : 'set E2E_TEST=true and start all services'

const BOOK = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const PAY = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003'
const CAL = process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002'
const ANA = process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005'

// Должен совпадать со значением BOT_GATEWAY_SECRET / TRUSTED_BOT_SECRET в docker-compose
const SIGNING_SECRET = process.env.SERVICE_SIGNING_SECRET ?? 'dev-secret'

// Уникальный user id для каждого запуска тестов — не пересекается с seed-данными
const TEST_USER = 100_000 + Math.floor(Math.random() * 90_000)

// ─── auth helpers ─────────────────────────────────────────────────────────────

/**
 * Строит HMAC-подписанные заголовки для межсервисного запроса.
 * Повторяет логику @metrix/auth buildAuthHeaders без прямого импорта.
 */
function authHeaders(method: string, path: string, body: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const requestId = randomUUID()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = createHmac('sha256', SIGNING_SECRET).update(message).digest('hex')
  return {
    'content-type': 'application/json',
    'x-service-name': 'e2e-test',
    'x-timestamp': timestamp,
    'x-request-id': requestId,
    'x-signature': signature,
  }
}

function userIdHeader(userId: number): Record<string, string> {
  const sig = createHmac('sha256', SIGNING_SECRET).update(String(userId)).digest('hex')
  return { 'x-user-id': String(userId), 'x-user-sig': sig }
}

// ─── http helpers ─────────────────────────────────────────────────────────────

async function get(base: string, path: string, userId?: number) {
  const headers: Record<string, string> = {
    ...authHeaders('GET', path, ''),
    ...(userId !== undefined ? userIdHeader(userId) : {}),
  }
  const r = await fetch(`${base}${path}`, { headers })
  return { status: r.status, body: await r.json() as unknown }
}

async function post(base: string, path: string, body: unknown, userId?: number) {
  const raw = JSON.stringify(body)
  const headers: Record<string, string> = {
    ...authHeaders('POST', path, raw),
    ...(userId !== undefined ? userIdHeader(userId) : {}),
  }
  const r = await fetch(`${base}${path}`, { method: 'POST', headers, body: raw })
  return { status: r.status, body: await r.json() as unknown }
}

async function patch(base: string, path: string, body: unknown, userId?: number) {
  const raw = JSON.stringify(body)
  const headers: Record<string, string> = {
    ...authHeaders('PATCH', path, raw),
    ...(userId !== undefined ? userIdHeader(userId) : {}),
  }
  const r = await fetch(`${base}${path}`, { method: 'PATCH', headers, body: raw })
  return { status: r.status, body: await r.json() as unknown }
}

// ─── helpers для получения ресурса и слота ────────────────────────────────────

type Location = { id: string; name: string }
type Resource = { id: string; name: string; priceLabel: string; priceMinorUnits: number }
type Slot = { id: string; startsAt: string; endsAt: string }
type Booking = { id: string; status: string; telegramUserId: number; slotId: string; resourceId: string }

async function getFirstAvailableSlot(): Promise<{ location: Location; resource: Resource; slot: Slot }> {
  const { body: locations } = await get(BOOK, '/locations')
  assert.ok(Array.isArray(locations) && (locations as unknown[]).length > 0, 'нет локаций — запусти seed')
  const location = (locations as Location[])[0]

  const { body: resources } = await get(BOOK, `/resources?locationId=${location.id}`)
  assert.ok(Array.isArray(resources) && (resources as unknown[]).length > 0, 'нет ресурсов в первой локации')
  const resource = (resources as Resource[])[0]

  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  assert.ok(Array.isArray(slots) && (slots as unknown[]).length > 0, 'нет свободных слотов — возможно занято')
  const slot = (slots as Slot[])[0]

  return { location, resource, slot }
}

/**
 * Строит slotId для кастомного слота — дублирует buildCustomSlotId из contracts.
 */
function buildCustomSlotId(resourceId: string, dateStr: string, hour: number, duration: number): string {
  return `${resourceId}-${dateStr}-${hour}-${duration}`
}

/**
 * Возвращает сегодняшнюю дату в формате YYYYMMDD.
 */
function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

// ─── тесты ────────────────────────────────────────────────────────────────────

test('все сервисы отвечают на /health', { skip: SKIP }, async () => {
  const checks = await Promise.all([
    get(BOOK, '/health'),
    get(PAY, '/health'),
    get(CAL, '/health'),
    get(ANA, '/health'),
  ])
  for (const { status, body } of checks) {
    assert.equal(status, 200, `сервис недоступен: ${JSON.stringify(body)}`)
    assert.equal((body as { ok: boolean }).ok, true)
  }
})

// ─── критический путь: list → slot → book → verify ───────────────────────────

test('полный путь бронирования: локация → ресурс → слот → бронь → проверка', { skip: SKIP }, async () => {
  const { resource, slot } = await getFirstAvailableSlot()

  // создать бронь
  const { status, body: booking } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER, resourceId: resource.id, slotId: slot.id },
    TEST_USER,
  )
  assert.equal(status, 201, `ожидали 201, получили ${status}: ${JSON.stringify(booking)}`)

  const b = booking as Booking
  assert.equal(b.status, 'active')
  assert.equal(b.telegramUserId, TEST_USER)
  assert.equal(b.slotId, slot.id)
  assert.equal(b.resourceId, resource.id)

  // бронь должна быть видна в списке броней пользователя
  const { body: list } = await get(BOOK, `/bookings?telegramUserId=${TEST_USER}`, TEST_USER)
  const found = (list as Booking[]).find((item) => item.id === b.id)
  assert.ok(found, 'созданная бронь не появилась в списке пользователя')
  assert.equal(found.status, 'active')
})

// ─── отмена брони ─────────────────────────────────────────────────────────────

test('отмена брони: бронь → отмена → статус cancelled', { skip: SKIP }, async () => {
  const { resource, slot } = await getFirstAvailableSlot()

  const { body: booking } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 1, resourceId: resource.id, slotId: slot.id },
    TEST_USER + 1,
  )
  const b = booking as Booking
  assert.ok(b.id)

  const { status, body: cancelled } = await patch(BOOK, `/bookings/${b.id}`, { status: 'cancelled' }, TEST_USER + 1)
  assert.equal(status, 200)
  assert.equal((cancelled as Booking).status, 'cancelled')

  // статус сохранился в БД
  const { body: list } = await get(BOOK, `/bookings?telegramUserId=${TEST_USER + 1}`, TEST_USER + 1)
  const inList = (list as Booking[]).find((item) => item.id === b.id)
  assert.ok(inList)
  assert.equal(inList.status, 'cancelled')
})

// ─── защита от двойного бронирования ─────────────────────────────────────────

test('двойное бронирование одного слота возвращает 409', { skip: SKIP }, async () => {
  const { resource, slot } = await getFirstAvailableSlot()

  // первая бронь — должна пройти
  const { status: s1 } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 2, resourceId: resource.id, slotId: slot.id },
    TEST_USER + 2,
  )
  assert.equal(s1, 201, 'первое бронирование должно вернуть 201')

  // вторая бронь на тот же слот — должна получить 409
  const { status: s2, body: err } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 3, resourceId: resource.id, slotId: slot.id },
    TEST_USER + 3,
  )
  assert.equal(s2, 409, `ожидали 409 Conflict, получили ${s2}: ${JSON.stringify(err)}`)
})

// ─── идемпотентность создания брони ──────────────────────────────────────────

test('повторный запрос с тем же idempotencyKey возвращает ту же бронь', { skip: SKIP }, async () => {
  const { resource } = await getFirstAvailableSlot()

  // слоты для нового пользователя (слоты ещё свободны)
  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  const slot = (slots as Slot[])[0]
  if (!slot) return // слоты закончились — тест пропускаем молча

  const idempotencyKey = randomUUID()
  const payload = { telegramUserId: TEST_USER + 4, resourceId: resource.id, slotId: slot.id, idempotencyKey }

  const { status: s1, body: b1 } = await post(BOOK, '/bookings', payload, TEST_USER + 4)
  assert.equal(s1, 201)

  // повторный запрос — тот же ключ
  const { status: s2, body: b2 } = await post(BOOK, '/bookings', payload, TEST_USER + 4)
  assert.equal(s2, 201, 'повторный запрос должен вернуть 201, а не 409')
  assert.equal((b1 as Booking).id, (b2 as Booking).id, 'id брони должен совпадать при повторе')
})

// ─── кастомный слот (выбор даты и времени вручную) ───────────────────────────

test('бронирование кастомного слота с произвольным временем', { skip: SKIP }, async () => {
  const { resource } = await getFirstAvailableSlot()

  const date = todayStr()
  const hour = 15
  const duration = 2
  const slotId = buildCustomSlotId(resource.id, date, hour, duration)

  const { status, body: booking } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 5, resourceId: resource.id, slotId },
    TEST_USER + 5,
  )
  assert.equal(status, 201, `кастомный слот не принят: ${JSON.stringify(booking)}`)
  const b = booking as Booking
  assert.equal(b.status, 'active')
  assert.equal(b.slotId, slotId)
})

test('GET /slots?date= возвращает слоты для нужной даты', { skip: SKIP }, async () => {
  const { resource } = await getFirstAvailableSlot()
  const date = todayStr()

  const { status, body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}&date=${date}`)
  assert.equal(status, 200)
  assert.ok(Array.isArray(slots), 'ожидали массив слотов')

  // Все слоты должны содержать дату в своём id
  for (const slot of slots as Slot[]) {
    assert.ok(
      slot.id.includes(date),
      `слот ${slot.id} должен содержать дату ${date}`,
    )
  }
})

// ─── аналитика ────────────────────────────────────────────────────────────────

test('analytics /stats обновляется после создания брони', { skip: SKIP }, async () => {
  const { status: s1, body: before } = await get(ANA, '/stats')
  assert.equal(s1, 200)
  const totalBefore = (before as { total: number }).total ?? 0

  // создаём бронь
  const { resource } = await getFirstAvailableSlot()
  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  const slot = (slots as Slot[])[0]
  if (!slot) return

  await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 6, resourceId: resource.id, slotId: slot.id },
    TEST_USER + 6,
  )

  // небольшая пауза для асинхронной агрегации
  await new Promise((r) => setTimeout(r, 500))

  const { status: s2, body: after } = await get(ANA, '/stats')
  assert.equal(s2, 200)
  const totalAfter = (after as { total: number }).total ?? 0
  assert.ok(totalAfter >= totalBefore + 1, `total должен вырасти: было ${totalBefore}, стало ${totalAfter}`)
})

// ─── некорректные запросы ─────────────────────────────────────────────────────

test('POST /bookings без resourceId возвращает 400', { skip: SKIP }, async () => {
  const { status } = await post(BOOK, '/bookings', { telegramUserId: TEST_USER, slotId: 'x' }, TEST_USER)
  assert.equal(status, 400)
})

test('PATCH /bookings/:id несуществующей брони возвращает 404', { skip: SKIP }, async () => {
  const { status } = await patch(BOOK, `/bookings/non-existent-id-${randomUUID()}`, { status: 'cancelled' }, TEST_USER)
  assert.equal(status, 404)
})

test('PATCH /bookings/:id с недопустимым статусом возвращает 400', { skip: SKIP }, async () => {
  const { resource } = await getFirstAvailableSlot()
  const { body: slots } = await get(BOOK, `/slots?resourceId=${resource.id}`)
  const slot = (slots as Slot[])[0]
  if (!slot) return

  const { body: booking } = await post(
    BOOK,
    '/bookings',
    { telegramUserId: TEST_USER + 7, resourceId: resource.id, slotId: slot.id },
    TEST_USER + 7,
  )
  const b = booking as Booking

  // попытка установить недопустимый статус
  const { status } = await patch(BOOK, `/bookings/${b.id}`, { status: 'active' }, TEST_USER + 7)
  assert.equal(status, 400)
})

// ─── calendar service ─────────────────────────────────────────────────────────

test('calendar /connections возвращает пустой список для нового пользователя', { skip: SKIP }, async () => {
  const { status, body } = await get(CAL, `/connections?telegramUserId=${TEST_USER}`, TEST_USER)
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
  assert.equal((body as unknown[]).length, 0, 'у нового пользователя не должно быть подключений')
})
