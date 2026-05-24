# Session and Token Security

Этот документ объясняет как работают сессии и токены в Metrix — для разработчиков.

Вся логика живёт в `security-service`. Другие сервисы вызывают его по HTTP.
Полный список endpoints: `docs/architecture/SECURITY_SERVICE.md`.

## Как это работает вместе

```
Вход пользователя (в bot-gateway)
      │
      ▼
POST /login/check × 2   ← security-service проверяет IP и userId (brute-force)
      │
      ▼
 verifyPassword()        ← PBKDF2 120k итераций (в bot-gateway)
      │
      ▼
POST /login/reset × 2   ← security-service сбрасывает счётчики
      │
      ▼
POST /sessions          ← security-service создаёт сессию
      │
      ├── accessToken   → JWT, живёт 15 минут
      └── refreshToken  → случайные 32 байта, живёт 30 дней
```

```
Запрос с access token (в bot-gateway)
      │
      ▼
POST /tokens/verify     ← security-service проверяет подпись JWT + blacklist
      │
      ▼
  { id, role }          ← identity пользователя
      │
      ▼
  обрабатываем запрос
```

```
Обновление токена (в bot-gateway)
      │
      ▼
POST /sessions/rotate   ← security-service удаляет старый токен, создаёт новый
      │
      ├── 200 → новый accessToken + новый refreshToken
      ├── 401 "refresh token not found" → токен уже использован (возможна кража)
      └── 401 "session expired" → прошло 30 дней, нужен повторный вход
```

```
Logout (в bot-gateway)
      │
      ▼
DELETE /sessions        ← security-service удаляет сессию и кладёт токен в blacklist
```

---

## Почему одноразовые refresh токены

При обычном подходе refresh token можно использовать много раз.
Если он утёк — атакующий незаметно обновляет сессию снова и снова.

В Metrix каждый refresh token используется ровно один раз:
1. При ротации старый токен удаляется из базы атомарно.
2. Если тот же токен придёт снова — его уже нет в базе → `401`.
3. Легитимный пользователь заметит, что его токен не работает.

Это детектирование кражи токена — side effect одноразовости.

---

## Ротация JWT секрета

Менять секрет нужно периодически или при подозрении на компрометацию.
Благодаря `kid` это можно сделать без мгновенного разлогина пользователей.

**Шаг 1.** Генерируем новый секрет:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Шаг 2.** Обновляем env у security-service — старый секрет в `JWT_PREVIOUS_KEYS`:
```
JWT_KEY_ID=v2
JWT_SECRET=<новый секрет>
JWT_PREVIOUS_KEYS=v1:<старый секрет>
```

**Шаг 3.** Деплоим security-service. Новые токены подписываются v2, старые (v1) продолжают работать.

**Шаг 4.** Через 15 минут (TTL access token) убираем `JWT_PREVIOUS_KEYS`.

---

## Brute-force защита — как вызвать из сервиса

Вызывать security-service дважды: для IP и для userId. Оба должны быть разрешены.

```ts
// перед проверкой пароля — проверяем оба идентификатора
const [ipCheck, userCheck] = await Promise.all([
  securityClient.post('/login/check', { identifier: clientIp }),
  securityClient.post('/login/check', { identifier: userId }),
])

if (!ipCheck.allowed || !userCheck.allowed) {
  const retryAfter = Math.max(
    ipCheck.retryAfterSeconds ?? 0,
    userCheck.retryAfterSeconds ?? 0,
  )
  // вернуть 429 Too Many Requests с Retry-After: retryAfter
}

// проверяем пароль
const passwordOk = await verifyPassword(password, user.passwordHash)

if (!passwordOk) {
  // записываем неудачу для обоих идентификаторов
  await Promise.all([
    securityClient.post('/login/failure', { identifier: clientIp }),
    securityClient.post('/login/failure', { identifier: userId }),
  ])
  // вернуть 401
}

// успешный вход — сбрасываем счётчики, потом создаём сессию
await Promise.all([
  securityClient.post('/login/reset', { identifier: clientIp }),
  securityClient.post('/login/reset', { identifier: userId }),
])
const session = await securityClient.post('/sessions', { userId, userRole: 'employee' })
```

---

## CSP nonce — как использовать в layout

`proxy.ts` передаёт nonce через заголовок `x-nonce`.
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
