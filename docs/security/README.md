# Security Overview

Этот документ кратко объясняет безопасность Metrix.

## Главная мысль

Система защищает не только вход пользователя, но и внутреннее общение сервисов.
Один обход не должен открывать доступ ко всему — каждый слой работает независимо.

## Что используется

**Аутентификация и сессии**
- Выделенный security-service — единственное место, которое выпускает и проверяет токены
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
- выпускать JWT не через security-service

## Файлы с реализацией

| Что                         | Где                                                             |
|-----------------------------|-----------------------------------------------------------------|
| Весь auth bot runtime       | `apps/bot/services/security-service/src/`                       |
| JWT + kid versioning        | `apps/bot/services/security-service/src/jwt.ts`                 |
| Сессии (refresh rotation)   | `apps/bot/services/security-service/src/session-store.ts`       |
| Token blacklist             | `apps/bot/services/security-service/src/token-blacklist.ts`     |
| Login rate limiter          | `apps/bot/services/security-service/src/login-rate-limiter.ts`  |
| HTTP endpoints              | `apps/bot/services/security-service/src/security-router.ts`     |
| CSP nonce (веб)             | `apps/web/proxy.ts`                                             |
| HMAC service-to-service     | `apps/bot/packages/auth/src/index.ts`                           |

## Документация по темам

- Все endpoints security-service: `docs/architecture/SECURITY_SERVICE.md`
- Полная архитектура безопасности: `docs/architecture/SECURITY.md`
- Как работают сессии и токены: `docs/architecture/SESSION_AND_TOKEN_SECURITY.md`
- Ротация секретов: `docs/architecture/SECRET_ROTATION.md`
