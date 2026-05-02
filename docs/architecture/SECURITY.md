# Security Architecture

Этот документ описывает модель безопасности микросервисной части Metrix (`apps/bot`).

---

## Модель угроз

Система работает на localhost и предназначена для тестирования, но реализует production-уровень защиты, потому что:

- Telegram-бот доступен любому пользователю в интернете
- Скомпрометированный один сервис не должен давать доступ ко всем остальным
- Данные пользователей (токены Google, платёжные инвойсы) требуют строгой изоляции

### Доверенная граница

```
Интернет
    │
    ▼
[Telegram API] ──long-polling──▶ [bot-gateway :3000]  ◀── единственная публичная точка
                                        │
                          Docker internal network
                ┌───────────┬───────────┬───────────┐
                ▼           ▼           ▼           ▼
          booking      calendar     payment     admin
          :3001        :3002        :3003       :3006
                                ▲
                          analytics
                           :3005
```

Все сервисы кроме `bot-gateway:3000` видны **только внутри Docker-сети** — без `ports:` в docker-compose.

---

## 1. Сетевая изоляция

### Что сделано

`docker-compose.yml` использует `expose:` вместо `ports:` для всех внутренних сервисов:

```yaml
booking-service:
  expose:
    - '3001'   # виден только внутри docker network

bot-gateway:
  ports:
    - '3000:3000'  # единственный публичный порт
```

PostgreSQL и Redis тоже не пробрасываются на хост:

```yaml
postgres:
  expose:
    - '5432'   # недоступен с хоста

redis:
  expose:
    - '6379'
```

### Итог

Атакующий снаружи не может напрямую обратиться к `booking-service`, `admin-service` или БД — только через bot-gateway.

---

## 2. Service-to-Service аутентификация

### Проблема с одним общим секретом

Единый `INTERNAL_SECRET` означает: скомпрометирован один сервис → скомпрометированы все.

### Решение: per-service HMAC подписи

Каждый вызывающий сервис имеет **свой** signing secret. Принимающий сервис хранит список доверенных вызывающих и их секреты.

#### Структура запроса

Каждый межсервисный HTTP-запрос содержит заголовки:

```
X-Service-Name: bot-gateway
X-Timestamp:    1746140400
X-Request-Id:   550e8400-e29b-41d4-a716-446655440000
X-Signature:    a3f2c1d4...  (hex, 64 символа)
Content-Type:   application/json
```

#### Формула подписи

```
message = METHOD + "\n"
        + path    + "\n"
        + timestamp + "\n"
        + request_id + "\n"
        + sha256(body_bytes)

signature = HMAC-SHA256(service_signing_secret, message)
```

Подпись покрывает **метод, путь, время, уникальный ID и хэш тела** — подмена любого из этих компонентов делает подпись невалидной.

#### Матрица доверия

| Принимающий сервис | Доверяет вызовам от |
|---|---|
| `booking-service` | bot-gateway, payment-service, analytics-service, admin-service |
| `calendar-service` | bot-gateway |
| `payment-service` | bot-gateway |
| `analytics-service` | bot-gateway, admin-service |
| `admin-service` | bot-gateway |

#### Переменные окружения

```env
# Каждый сервис имеет свой signing secret
GATEWAY_SIGNING_SECRET=<32+ символов>
PAYMENT_SIGNING_SECRET=<32+ символов>
ANALYTICS_SIGNING_SECRET=<32+ символов>
ADMIN_SIGNING_SECRET=<32+ символов>

# booking-service знает секреты всех своих вызывающих
TRUSTED_GATEWAY_SECRET=<= GATEWAY_SIGNING_SECRET>
TRUSTED_PAYMENT_SECRET=<= PAYMENT_SIGNING_SECRET>
TRUSTED_ANALYTICS_SECRET=<= ANALYTICS_SIGNING_SECRET>
TRUSTED_ADMIN_SECRET=<= ADMIN_SIGNING_SECRET>
```

#### Код верификации (`packages/auth/src/index.ts`)

```typescript
export function verifyServiceRequest(
  req: IncomingMessage,
  rawBody: string,
  trusted: TrustedCaller[],
): VerifyResult {
  // 1. проверить наличие всех заголовков
  // 2. проверить что timestamp в пределах 30 секунд
  // 3. найти вызывающий сервис в списке доверенных
  // 4. воспроизвести подпись и сравнить через timingSafeEqual
}
```

`timingSafeEqual` защищает от timing-атак при сравнении HMAC.

---

## 3. Защита от Replay-атак

### Проблема

Даже валидный подписанный запрос можно повторить (перехватить и отправить снова).

### Решение: Request-Id + Redis TTL

Каждый запрос содержит уникальный `X-Request-Id` (UUID v4). Принимающий сервис:

1. Пытается записать `SET replay:<request_id> 1 EX 60 NX` в Redis
2. Если Redis вернул `OK` — запрос новый, пропускаем
3. Если `null` — ID уже видели, возвращаем **409 Conflict**

```typescript
// redis-bus/src/index.ts
async checkReplay(requestId: string, ttlSeconds = 60): Promise<boolean> {
  const result = await this.pub.set(`replay:${requestId}`, '1', 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}
```

Временное окно `X-Timestamp` дополнительно ограничено **30 секундами** — запрос старше этого порога отклоняется ещё до проверки replay.

### Цепочка защиты

```
запрос получен
      │
      ▼
timestamp в пределах 30s?  ──нет──▶ 401
      │да
      ▼
HMAC подпись верна?  ──нет──▶ 401
      │да
      ▼
request-id не видели?  ──нет──▶ 409 (replay)
      │да
      ▼
обработка запроса
```

---

## 4. Идентификация пользователя (X-User-Id)

### Проблема

Если `telegramUserId` передаётся в теле запроса, любой аутентифицированный сервис может подделать его.

### Решение: подписанный заголовок от bot-gateway

Bot-gateway — единственный сервис, взаимодействующий с Telegram. Он подписывает userId отдельным секретом:

```
X-User-Id:  123456789
X-User-Sig: HMAC-SHA256(USER_ID_SIGNING_SECRET, "123456789")
```

Принимающий сервис верифицирует подпись через `timingSafeEqual`. Если заголовок отсутствует — запрос автоматический (например, payment-service после оплаты), `telegramUserId` берётся из тела.

```typescript
// packages/auth/src/index.ts
export function extractUserId(req: IncomingMessage, secret: string): number | undefined {
  const rawId = req.headers['x-user-id']
  const rawSig = req.headers['x-user-sig']
  if (!rawId) return undefined        // автоматический вызов, userId в body
  if (!rawSig) throw new Error(...)   // заголовок есть, но подпись отсутствует
  // timingSafeEqual(expected, given)
}
```

### Проверка владельца брони

`booking-service` при отмене брони:

```typescript
if (callerUserId !== undefined && Number(existing.telegramUserId) !== callerUserId) {
  audit({ action: 'booking.cancel.forbidden', userId: callerUserId, bookingId })
  return json(res, { error: 'forbidden' }, 403)
}
```

Пользователь не может отменить чужую бронь даже зная её ID.

---

## 5. OAuth State — защита от подмены userId

### Проблема

Google OAuth возвращает `state` параметр в redirect. Без подписи атакующий может подменить `telegramUserId` в state и привязать чужой Google-аккаунт.

### Решение: HMAC-SHA256 подпись state

При генерации auth URL:
```typescript
// state = base64url(JSON) + "." + HMAC-SHA256(base64url(JSON), TOKEN_SECRET)
const state = signOAuthState({ telegramUserId, scope, resourceId }, TOKEN_SECRET)
```

При обработке callback:
```typescript
// timingSafeEqual(expected_hmac, given_hmac) — иначе throw
const stateData = verifyOAuthState(body.state, TOKEN_SECRET)
```

Если `state` подделан или повреждён — `calendar-service` возвращает 400 и не создаёт подключение.

---

## 6. Шифрование токенов Google

OAuth access/refresh токены хранятся в PostgreSQL в зашифрованном виде:

```
AES-256-GCM(token, SHA256(CALENDAR_TOKEN_SECRET))
```

Формат хранения: `base64(iv).base64(auth_tag).base64(ciphertext)`

- **AES-256-GCM** — аутентифицированное шифрование (AEAD), обнаруживает модификацию
- **Случайный IV** (12 байт) — каждое шифрование уникально
- `CALENDAR_TOKEN_SECRET` **обязателен** — сервис не запустится без него:

```typescript
const TOKEN_SECRET = process.env.CALENDAR_TOKEN_SECRET
if (!TOKEN_SECRET) throw new Error('CALENDAR_TOKEN_SECRET env var is required')
```

---

## 7. Rate Limiting

Bot-gateway ограничивает частоту запросов от каждого пользователя:

- **Лимит**: 10 запросов за 10 секунд (sliding window)
- **Реализация**: in-memory Map (single-process bot)
- **При превышении**: бот отвечает "Too many requests." и игнорирует update

```typescript
class RateLimiter {
  isAllowed(userId: number): boolean {
    const now = Date.now()
    const hits = (this.buckets.get(userId) ?? []).filter((t) => now - t < this.windowMs)
    if (hits.length >= this.limit) return false
    hits.push(now)
    this.buckets.set(userId, hits)
    // prune stale entries when map > 10 000 entries
    return true
  }
}
```

---

## 8. Защита от Double Booking (Race Condition)

Два слоя защиты:

### Слой 1: Prisma transaction

```typescript
const booking = await prisma.$transaction(async (tx) => {
  const taken = await tx.booking.findFirst({
    where: { resourceId, slotId, status: 'active' }
  })
  if (taken) throw Object.assign(new Error('slot taken'), { code: 'SLOT_TAKEN' })
  return tx.booking.create({ ... })
})
```

### Слой 2: PostgreSQL partial unique index (финальный guard)

```sql
-- init.sql
CREATE UNIQUE INDEX booking_active_slot_unique
  ON booking."Booking" ("resourceId", "slotId")
  WHERE status = 'active';
```

Даже при двух параллельных запросах, которые одновременно прошли transaction-check, PostgreSQL откажет второму через unique constraint violation (`P2002`).

---

## 9. Валидация входных данных

Каждый сервис проверяет:

- **Content-Type**: только `application/json` для POST/PATCH/DELETE
- **Размер тела**: максимум 64 KB
- **Типы полей**: `telegramUserId` — положительное целое число, `resourceId`/`slotId` — непустые строки
- **status при отмене**: только `cancelled` или `rescheduled`

```typescript
// packages/auth/src/index.ts
export function readJsonBody<T>(req: IncomingMessage): Promise<{ raw: string; parsed: T }> {
  const ct = req.headers['content-type'] ?? ''
  if (!ct.includes('application/json')) {
    return Promise.reject(new Error('content-type must be application/json'))
  }
  return readBody(req).then(...)  // MAX_BODY_BYTES = 64 * 1024
}
```

---

## 10. Redis Security

```yaml
redis:
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --rename-command FLUSHALL ""
    --rename-command FLUSHDB ""
    --rename-command DEBUG ""
    --rename-command CONFIG ""
```

- Пароль обязателен
- Опасные команды отключены через `rename-command ""`
- Redis доступен только внутри Docker-сети

---

## 11. Audit Log

Мутирующие действия пишут структурированный JSON в stdout:

```json
{
  "ts": "2026-05-02T10:00:00.000Z",
  "service": "booking",
  "action": "booking.cancelled",
  "userId": 123456789,
  "bookingId": "booking-1746140400000",
  "requestId": "550e8400-...",
  "callerService": "bot-gateway"
}
```

Покрытые события:

| Событие | Сервис |
|---|---|
| `booking.created` | booking-service |
| `booking.cancelled` | booking-service |
| `booking.cancel.forbidden` | booking-service |
| `invoice.created` | payment-service |
| `payment.completed` | payment-service |
| `calendar.connected` | calendar-service |
| `calendar.disconnected` | calendar-service |
| `location.updated` | admin-service |
| `resource.updated` | admin-service |

---

## 12. SSRF Protection

`calendar-service` делает внешние HTTP-запросы только к Google OAuth. Список разрешённых хостов захардкожен:

```typescript
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'oauth2.googleapis.com',
  'accounts.google.com',
])

async function exchangeGoogleCode(code: string) {
  const target = new URL('https://oauth2.googleapis.com/token')
  if (!ALLOWED_EXTERNAL_HOSTS.has(target.hostname)) {
    throw new Error(`SSRF: disallowed host ${target.hostname}`)
  }
  // ...
}
```

---

## 13. Конфигурация (.env)

Полный список переменных окружения для production:

```env
# Инфраструктура
POSTGRES_PASSWORD=<случайный 32+ символа>
REDIS_PASSWORD=<случайный 32+ символа>

# Telegram
TELEGRAM_BOT_TOKEN=<токен от @BotFather>
ADMIN_TELEGRAM_IDS=<id1,id2>

# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=<из GCP Console>
GOOGLE_CALENDAR_CLIENT_SECRET=<из GCP Console>
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/calendar/google/callback
CALENDAR_TOKEN_SECRET=<случайный 32+ символа, ОБЯЗАТЕЛЕН>

# Оплата
YOOKASSA_PROVIDER_TOKEN=<провайдер токен>
PAYMENT_CURRENCY=RUB

# Service signing secrets (каждый уникален)
GATEWAY_SIGNING_SECRET=<случайный 32+ символа>
PAYMENT_SIGNING_SECRET=<случайный 32+ символа>
ANALYTICS_SIGNING_SECRET=<случайный 32+ символа>
ADMIN_SIGNING_SECRET=<случайный 32+ символа>

# User identity
USER_ID_SIGNING_SECRET=<случайный 32+ символа>
```

Сгенерировать все секреты сразу:

```bash
node -e "
const { randomBytes } = require('crypto')
const keys = [
  'POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'CALENDAR_TOKEN_SECRET',
  'GATEWAY_SIGNING_SECRET', 'PAYMENT_SIGNING_SECRET',
  'ANALYTICS_SIGNING_SECRET', 'ADMIN_SIGNING_SECRET', 'USER_ID_SIGNING_SECRET'
]
keys.forEach(k => console.log(k + '=' + randomBytes(32).toString('hex')))
"
```

---

## 14. Что остаётся для production

| Задача | Приоритет |
|---|---|
| HTTPS на OAuth callback URI | 🔴 обязательно |
| Telegram webhook + `secret_token` (вместо long polling) | 🟠 рекомендуется |
| Ротация секретов (GATEWAY_SIGNING_SECRET и др.) | 🟠 рекомендуется |
| Централизованные логи (Loki / Datadog) | 🟡 желательно |
| Redis ACL (per-user permissions вместо rename-command) | 🟡 желательно |
| Dependency scanning (npm audit в CI) | 🟡 желательно |

---

## Связанные документы

- [System Overview](./SYSTEM_OVERVIEW.md)
- [Deployment](./DEPLOYMENT.md)
- [Queues and Events](./QUEUES_AND_EVENTS.md)
- [Source: packages/auth](../../apps/bot/packages/auth/src/index.ts)
