# Session and Token Security

Этот документ объясняет как работают сессии и токены в Metrix — для разработчиков.

## Как это работает вместе

```
Вход пользователя
      │
      ▼
 verifyPassword()   ← PBKDF2 120k итераций
      │
      ▼
checkLoginAllowed() ← проверяем, не заблокирован ли IP/userId (brute-force защита)
      │
      ▼
 createSession()    ← создаём сессию: access token (JWT) + refresh token (случайные байты)
      │
      ├── access token  → живёт 15 минут, проверяется без БД
      └── refresh token → живёт 30 дней, хранится в базе
```

```
Запрос с access token
      │
      ▼
authenticateRequest() ← проверяем подпись JWT + kid
      │
      ▼
isAccessTokenRevoked() ← проверяем blacklist в Redis (если redis передан)
      │
      ▼
  обрабатываем запрос
```

```
Обновление токена (refresh)
      │
      ▼
rotateSession()  ← находим сессию, удаляем старый токен, создаём новый (атомарно)
      │
      ├── ok        → новый access token + новый refresh token
      ├── not_found → токен не существует или уже использован
      └── expired   → сессия истекла, нужен повторный вход
```

```
Logout
      │
      ▼
revokeAccessToken()  ← кладём SHA-256 хеш токена в Redis blacklist на 16 минут
      │
      ▼
deleteSession()      ← удаляем refresh token из базы
```

---

## JWT с kid — как использовать

### Создание секретов

```ts
import type { JwtSecrets } from '@metrix/api'

const jwtSecrets: JwtSecrets = {
  current: {
    id: 'v2',           // уникальный идентификатор ключа
    secret: process.env.JWT_SECRET_V2,
  },
  // previous нужен только во время ротации
  previous: [
    {
      id: 'v1',
      secret: process.env.JWT_SECRET_V1,
    },
  ],
}
```

### Создание сессии

```ts
import { createSession } from '@metrix/api'

const tokens = await createSession({
  jwtSecrets,
  prisma,
  role: 'employee',
  userId: user.id,
})
// tokens.accessToken  — JWT с kid в header
// tokens.refreshToken — случайные 32 байта
```

### Проверка токена

```ts
import { authenticateRequest } from '@metrix/api'

const result = await authenticateRequest({
  authorization: req.headers.authorization,
  jwtSecrets,
  redis, // опционально — для проверки blacklist
})

if (result.status === 'error') {
  // отклоняем запрос
}
// result.user.id, result.user.role
```

---

## Ротация JWT секрета

Менять секрет нужно периодически или при подозрении на компрометацию.
Благодаря kid это можно сделать без мгновенного разлогина пользователей.

**Шаг 1.** Генерируем новый секрет:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Шаг 2.** Обновляем конфиг — старый секрет в `previous`, новый в `current`:
```ts
const jwtSecrets: JwtSecrets = {
  current: { id: 'v3', secret: NEW_SECRET },
  previous: [{ id: 'v2', secret: OLD_SECRET }],
}
```

**Шаг 3.** Деплоим сервис. Новые токены подписываются v3, старые (v2) продолжают работать.

**Шаг 4.** Через 15 минут (TTL access token) убираем v2 из `previous`.

---

## Brute-force защита — как подключить

Вызывать до проверки пароля, передавая IP и userId как отдельные идентификаторы:

```ts
import { checkLoginAllowed, recordFailedLogin, resetLoginAttempts } from '@metrix/api'

// проверяем оба идентификатора
const ipCheck = await checkLoginAllowed(clientIp, redis)
const userCheck = await checkLoginAllowed(userId, redis)

if (ipCheck.status === 'locked' || userCheck.status === 'locked') {
  const retryAfter = Math.max(
    ipCheck.status === 'locked' ? ipCheck.retryAfterSeconds : 0,
    userCheck.status === 'locked' ? userCheck.retryAfterSeconds : 0,
  )
  // вернуть 429 Too Many Requests с Retry-After: retryAfter
}

// проверяем пароль
const passwordOk = await verifyPassword(password, user.passwordHash)

if (!passwordOk) {
  // записываем неудачу для обоих идентификаторов
  await recordFailedLogin(clientIp, redis)
  await recordFailedLogin(userId, redis)
  // вернуть 401
}

// успешный вход — сбрасываем счётчики
await resetLoginAttempts(clientIp, redis)
await resetLoginAttempts(userId, redis)
```

---

## CSP nonce — как использовать в layout

middleware.ts передаёт nonce через заголовок `x-nonce`.
В layout.tsx его можно прочитать через Next.js `headers()`:

```tsx
import { headers } from 'next/headers'
import Script from 'next/script'

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html>
      <body>
        {children}
        {/* скрипты нужно передавать через nonce — тогда CSP их пропустит */}
        <Script nonce={nonce} src="/some-script.js" />
      </body>
    </html>
  )
}
```

Inline-скрипты без nonce будут заблокированы браузером — это правильное поведение.
