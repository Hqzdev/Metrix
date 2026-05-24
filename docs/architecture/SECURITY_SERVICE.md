# Security Service

Отдельный микросервис, который отвечает за всю безопасность Telegram bot runtime.

## Зачем отдельный сервис

Раньше JWT, сессии и rate limiter были разбросаны по разным сервисам.
Если нужно было поменять что-то в безопасности — правки вносились в несколько мест.

Security-service собирает всё в одном месте:
- только он выпускает access и refresh токены
- только он проверяет токены
- только он ведёт счётчики brute-force
- только он пишет в Redis blacklist

Остальные сервисы вместо того чтобы делать это самостоятельно, спрашивают security-service.

## Расположение

```
apps/bot/services/security-service/
├── src/
│   ├── index.ts             — точка входа, HTTP-сервер, graceful shutdown
│   ├── security-router.ts   — все HTTP endpoints
│   ├── config.ts            — чтение конфига из env
│   ├── jwt.ts               — создание и проверка JWT
│   ├── session-store.ts     — сессии в PostgreSQL
│   ├── token-blacklist.ts   — blacklist в Redis
│   ├── login-rate-limiter.ts — brute-force защита в Redis
│   ├── errors.ts            — доменные ошибки с HTTP статусами
│   ├── http-response.ts     — отправка JSON ответов
│   └── logger.ts            — структурированный JSON логгер
├── .env.example             — переменные окружения с объяснениями
├── package.json
└── tsconfig.json
```

## Порт

`3008` — локально и в docker-compose.

## Кто обращается к security-service

Только два сервиса имеют доступ:

- **bot-gateway** — логин пользователя: проверяет brute-force, создаёт сессию, проверяет токены
- **admin-service** — admin-логин, принудительный logout, проверка токенов

Все запросы подписаны HMAC. Без правильной подписи — 401.

---

## Endpoints

Все endpoints кроме `/health` и `/ready` требуют service-to-service HMAC подпись.

### Liveness и readiness

```
GET /health   → { ok: true }
GET /ready    → { ok: true }  (проверяет PostgreSQL и Redis)
```

---

### Сессии

#### Создать сессию

```
POST /sessions
```

Вызывается после того, как caller сам проверил пароль пользователя.
Security-service не знает о паролях — он только выпускает токены.

Тело запроса:
```json
{
  "userId": "user_id_строка",
  "userRole": "admin" | "employee"
}
```

Ответ `201`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "случайная-строка",
  "expiresAt": "2026-06-23T12:00:00.000Z"
}
```

`accessToken` живёт 15 минут. `refreshToken` живёт 30 дней.
`expiresAt` — это когда истекает refresh token (не access token).

---

#### Ротировать refresh token

```
POST /sessions/rotate
```

Вызывается когда access token истёк и нужна новая пара токенов.
Каждый refresh token одноразовый — после использования уничтожается.

Тело:
```json
{
  "refreshToken": "текущий-refresh-token"
}
```

Ответ `200`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "новый-refresh-token"
}
```

Если refresh token не найден в базе (уже использован или не существует) — `401`.
Это может означать попытку replay или утечку токена.

Если сессия истекла (прошло 30 дней) — `401`, нужен повторный вход.

---

#### Logout

```
DELETE /sessions
```

Удаляет сессию из базы. Если передан access token — немедленно добавляет в blacklist.

Тело:
```json
{
  "refreshToken": "текущий-refresh-token",
  "accessToken": "текущий-access-token"
}
```

`accessToken` — необязательный, но рекомендуется передавать.
Без него access token продолжит работать до истечения 15 минут.

Ответ `200`:
```json
{ "ok": true }
```

---

#### Удалить все сессии пользователя

```
DELETE /sessions/all
```

Завершает все активные сессии пользователя.
Используется при смене пароля или компрометации аккаунта.

Тело:
```json
{
  "userId": "user_id_строка"
}
```

Ответ `200`:
```json
{
  "ok": true,
  "deletedCount": 3
}
```

Access tokens продолжат работать до истечения TTL (15 минут),
если caller не отзывает их отдельно через `/tokens/revoke`.

---

### Токены

#### Проверить JWT

```
POST /tokens/verify
```

Проверяет подпись токена, срок жизни и наличие в blacklist.
Возвращает identity пользователя если токен валиден.

Тело:
```json
{
  "token": "eyJ..."
}
```

Ответ `200`:
```json
{
  "id": "user_id_строка",
  "role": "admin" | "employee"
}
```

Если токен невалиден, истёк или отозван — `401`.

---

#### Добавить в blacklist

```
POST /tokens/revoke
```

Добавляет access token в Redis blacklist.
После этого `/tokens/verify` будет возвращать `401` для этого токена.

Тело:
```json
{
  "token": "eyJ..."
}
```

Ответ `200`:
```json
{ "ok": true }
```

В Redis хранится SHA-256 хеш токена, не сам токен.
Запись автоматически удаляется через 16 минут.

---

### Brute-force защита

#### Проверить, разрешён ли вход

```
POST /login/check
```

Проверяет, не заблокирован ли идентификатор (IP или userId).
Рекомендуется вызывать дважды — отдельно для IP и отдельно для userId.

Тело:
```json
{
  "identifier": "192.168.1.1" | "user_id_строка"
}
```

Ответ `200`:
```json
{ "allowed": true }
// или
{ "allowed": false, "retryAfterSeconds": 60 }
```

---

#### Записать неудачную попытку

```
POST /login/failure
```

Увеличивает счётчик неудач. Если превышен лимит — блокирует identifier.

Тело:
```json
{
  "identifier": "192.168.1.1" | "user_id_строка"
}
```

Ответ `200`:
```json
{ "ok": true }
// или если только что заблокировали:
{ "ok": true, "locked": true, "retryAfterSeconds": 60 }
```

---

#### Сбросить счётчик

```
POST /login/reset
```

Сбрасывает счётчик неудач после успешного входа.
Вызывать до создания сессии, сразу после подтверждения пароля.

Тело:
```json
{
  "identifier": "192.168.1.1" | "user_id_строка"
}
```

Ответ `200`:
```json
{ "ok": true }
```

---

## Как подключить вызов из другого сервиса

Все запросы подписываются через `@metrix/auth`. Пример вызова из bot-gateway:

```ts
import { buildServiceRequest } from '@metrix/auth'

// создать подписанный запрос
const { headers, body } = buildServiceRequest({
  method: 'POST',
  path: '/tokens/verify',
  body: { token: accessToken },
  secret: config.gatewaySigningSecret,
})

const response = await fetch(`${config.securityServiceUrl}/tokens/verify`, {
  method: 'POST',
  headers,
  body,
})

const result = await response.json()
// result.id, result.role
```

---

## Переменные окружения

| Переменная              | Обязательная | Описание                                        |
|-------------------------|--------------|-------------------------------------------------|
| `PORT`                  | нет (3008)   | Порт HTTP-сервера                               |
| `DATABASE_URL`          | да           | PostgreSQL (через pgbouncer)                    |
| `REDIS_URL`             | да           | Redis для blacklist и rate limiter              |
| `SECURITY_SIGNING_SECRET` | да         | Секрет для исходящих HMAC-запросов              |
| `JWT_KEY_ID`            | да           | Идентификатор текущего JWT ключа (например: v1) |
| `JWT_SECRET`            | да           | Секрет текущего JWT ключа                       |
| `JWT_PREVIOUS_KEYS`     | нет          | Прошлые ключи: `id1:secret1,id2:secret2`        |
| `TRUSTED_GATEWAY_SECRET`  | да         | HMAC-секрет bot-gateway                         |
| `TRUSTED_GATEWAY_SECRET_NEXT` | нет    | Для плавной ротации секрета gateway             |
| `TRUSTED_ADMIN_SECRET`  | да           | HMAC-секрет admin-service                       |
| `TRUSTED_ADMIN_SECRET_NEXT` | нет      | Для плавной ротации секрета admin               |

---

## База данных

Security-service использует схему `security` в общей PostgreSQL базе.

Модель `SecuritySession`:
```
id           — первичный ключ
userId       — id пользователя
userRole     — admin или employee
refreshToken — одноразовый токен (unique)
expiresAt    — когда сессия истекает (через 30 дней)
createdAt    — когда создана
```

Индекс на `userId` — для быстрого поиска всех сессий при logout all.

---

## Redis ключи

| Префикс                       | Что хранит                              | TTL         |
|-------------------------------|-----------------------------------------|-------------|
| `security:blacklist:{hash}`   | SHA-256 хеш отозванного access token    | 16 минут    |
| `security:login:failures:{id}`| Счётчик неудачных попыток               | 30 минут    |
| `security:login:lockout:{id}` | Активная блокировка identifier          | до 30 минут |
| `security:replay:{requestId}` | Защита от повторного запроса            | 5 минут     |

---

## Ротация JWT секрета

Менять JWT секрет можно без разлогина пользователей.

1. Сгенерировать новый секрет: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
2. Установить новые env переменные:
   ```
   JWT_KEY_ID=v2
   JWT_SECRET=<новый секрет>
   JWT_PREVIOUS_KEYS=v1:<старый секрет>
   ```
3. Задеплоить. Новые токены подписываются v2, старые (v1) продолжают работать.
4. Через 15 минут (TTL access token) убрать `JWT_PREVIOUS_KEYS`.

---

## Что делать при компрометации

**Украден refresh token одного пользователя:**
- вызвать `DELETE /sessions/all` с его userId
- попросить пользователя войти заново

**Украден access token:**
- вызвать `POST /tokens/revoke` с токеном
- токен немедленно попадает в blacklist

**Скомпрометирован JWT секрет:**
- сгенерировать новый секрет
- убрать старый из `JWT_PREVIOUS_KEYS` (все старые токены станут невалидными)
- задеплоить — все пользователи будут разлогинены

**Скомпрометирован HMAC-секрет сервиса:**
- поменять `TRUSTED_GATEWAY_SECRET` или `TRUSTED_ADMIN_SECRET`
- использовать `_NEXT` вариант для плавной ротации без даунтайма
