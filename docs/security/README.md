# Security Overview

Этот документ кратко объясняет безопасность Metrix.

## Главная мысль

Система защищает не только вход пользователя, но и внутреннее общение сервисов.
Один обход не должен открывать доступ ко всему — каждый слой работает независимо.

## Что используется

**Аутентификация и сессии**
- HMAC-подписанные JWT с версионированием ключа (kid) — можно менять секрет без разлогина всех пользователей
- Одноразовые refresh токены — каждый refresh уничтожает старый токен и выдаёт новый
- Blacklist отозванных access токенов в Redis — мгновенный logout без ожидания TTL
- Brute-force защита на вход — блокировка по IP и userId после 5 неудачных попыток

**Внутренняя безопасность**
- HMAC для внутренних запросов между сервисами
- Replay protection через Redis — один request-id нельзя выполнить дважды
- Signed Telegram user id — bot-gateway подписывает user id, внутренние сервисы проверяют подпись
- OAuth state signing — redirect flow защищён от подмены данных

**Данные**
- Encryption для calendar refresh tokens
- PBKDF2 (120 000 итераций, sha512) для паролей
- Timing-safe сравнение для всех секретов

**Доступ и аудит**
- RBAC для admin-действий
- Audit log для всех важных действий
- Docker network boundary — PostgreSQL и Redis не видны снаружи
- Redis password + отключённые опасные команды

**Веб**
- CSP с nonce вместо unsafe-inline и без unsafe-eval
- HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy

## Что нельзя делать

- открывать PostgreSQL наружу
- открывать Redis наружу
- принимать internal request без подписи
- хранить refresh token открытым текстом
- replay-ить payment event без проверки
- использовать один JWT секрет без возможности ротации

## Файлы с реализацией

| Что                     | Где                                               |
|-------------------------|---------------------------------------------------|
| JWT + kid versioning    | `packages/api/src/shared/auth/jwt.ts`            |
| Refresh rotation        | `packages/api/src/shared/auth/session-service.ts`|
| Token blacklist         | `packages/api/src/shared/auth/token-blacklist.ts`|
| Login rate limiter      | `packages/api/src/shared/auth/login-rate-limiter.ts` |
| Auth guard              | `packages/api/src/shared/auth/auth-guard.ts`     |
| CSP proxy               | `apps/web/proxy.ts`                               |

## Главный документ

Подробности лежат в: `docs/architecture/SECURITY.md`
