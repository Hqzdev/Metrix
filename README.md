<img src="apps/web/public/images/banner.png" alt="Metrix" />

# Metrix

Инфраструктура бронирования офисных ресурсов: web-интерфейс, Telegram-бот, микросервисы, оплаты, календарные интеграции, аналитика и production-grade операционный слой.

[Website](https://metrixplatform.vercel.app) · [Telegram Bot](https://t.me/metritxsxbot) · [Docs](./docs/README.md) · [Engineering Report](./docs/REPORT.md) · [API](./docs/openapi/README.md)

![CI](https://github.com/Hqzdev/Metrix/actions/workflows/ci.yml/badge.svg)

---

## Что это

Metrix решает проблему хаотичного управления переговорными, рабочими местами и офисными ресурсами. Вместо таблиц, чатов и ручных договорённостей система даёт единый слой управления:

- пользователи бронируют ресурсы через web или Telegram;
- администраторы управляют ресурсами, ценами, статусами и загрузкой;
- события синхронизируются с календарями;
- платежи проходят через Telegram/YooKassa flow;
- аналитика показывает загрузку, peak hours, utilization и отчёты;
- backend защищает внутренние сервисы через HMAC, replay protection, RBAC и audit log.

Проект сделан не только как продуктовый прототип, но и как инженерная система: с ADR, OpenAPI, CI, observability, runbooks, backup strategy, security model и production readiness checklist.

---

## Ключевые возможности

### Пользовательские сценарии

- бронирование переговорных и рабочих мест;
- просмотр доступных слотов;
- отмена и просмотр своих броней;
- Telegram UX без обязательного web-интерфейса;
- напоминания и уведомления;
- платежи и подтверждение оплаты;
- синхронизация с календарями.

### Администрирование

- Telegram admin-сценарии по `ADMIN_TELEGRAM_IDS`;
- управление ресурсами, статусами и ценами;
- просмотр статистики и аналитики;
- audit log административных и security-событий;
- DLQ и recovery endpoints для операторских сценариев.

### Production-grade слой

- HMAC service-to-service authentication;
- replay protection через Redis TTL и `X-Request-Id`;
- signed Telegram user identity;
- Redis locks для конкурентного бронирования;
- rate limiting в bot-gateway;
- structured JSON logs;
- `/health`, `/ready`, `/metrics` endpoints;
- Redis Streams retry, pending processing и DLQ;
- persistent audit log и RBAC package;
- OpenAPI spec и typed contracts;
- PostgreSQL backup/restore strategy;
- CI quality gates: typecheck, tests, OpenAPI validation, audit.

---

## Архитектура

Metrix состоит из web-приложения и отдельного Telegram bot runtime на микросервисах.

```txt
Telegram User
  -> Telegram API
  -> bot-gateway
  -> booking-service
  -> payment-service
  -> calendar-service
  -> analytics-service
  -> admin-service
  -> PostgreSQL / Redis
```

Основные runtime-компоненты:

- `apps/web` — Next.js web-интерфейс и маркетинговые страницы;
- `apps/bot/services/bot-gateway` — публичная точка входа Telegram-бота;
- `apps/bot/services/booking-service` — бронирования, слоты, locks, idempotency;
- `apps/bot/services/payment-service` — payment holds, sagas, retry/recovery;
- `apps/bot/services/calendar-service` — Google OAuth, calendar tokens, sync;
- `apps/bot/services/analytics-service` — отчёты и агрегаты;
- `apps/bot/services/admin-service` — admin API, audit, DLQ replay;
- `apps/bot/services/notification-service` — Telegram delivery;
- `apps/bot/services/worker-service` — фоновые задачи;
- `apps/bot/packages/*` — shared auth, contracts, Redis bus, health, audit, RBAC, observability.

Инфраструктура:

- PostgreSQL — основной источник данных;
- PgBouncer — connection pooling;
- Redis — queues, locks, rate limit, replay protection, idempotency;
- Docker Compose — локальный runtime микросервисов;
- GitHub Actions — CI и dependency audit.

Подробнее: [System overview](./docs/architecture/SYSTEM_OVERVIEW.md), [Architecture diagrams](./docs/architecture/DIAGRAMS.md), [Production readiness](./docs/architecture/PRODUCTION_READINESS.md).

---

## Telegram-бот

Telegram-бот — не отдельный скрипт, а микросервисный runtime.

Поддержанные сценарии:

- `/start`, `/help` и навигация через inline keyboards;
- выбор ресурса, даты и времени;
- создание бронирования или payment hold;
- оплата через Telegram/YooKassa;
- просмотр своих броней;
- отмена брони;
- admin-команды и статистика;
- rate limit и idempotency Telegram updates;
- Redis-backed FSM state;
- delivery уведомлений и reminders.

Скриншоты:

<img src="/apps/web/public/screen/telegram/start.png" width="220" />
<img src="/apps/web/public/screen/telegram/book.png" width="220" />
<img src="/apps/web/public/screen/telegram/payment.png" width="220" />
<img src="/apps/web/public/screen/telegram/mybook.png" width="220" />
<img src="/apps/web/public/screen/telegram/admin.png" width="220" />
<img src="/apps/web/public/screen/telegram/analytics.png" width="220" />

Документация: [Bot block](./docs/telegram-bot/bot-block.md), [Services block](./docs/telegram-bot/services-block.md), [Operations and security](./docs/telegram-bot/operations.md), [Telegram diagrams](./docs/telegram-bot-diagrams/README.md).

---

## Web-интерфейс

Web-часть показывает продуктовую оболочку Metrix: главную страницу, бронирование, локации, memberships, about, FAQ, contacts, legal pages и адаптивный UI.

![Homepage](/apps/web/public/screen/1.png)
![Dashboard](/apps/web/public/screen/2.png)
![Booking](/apps/web/public/screen/4.png)

Mobile preview:

<img src="/apps/web/public/screen/mobile/1.png" width="200" />
<img src="/apps/web/public/screen/mobile/2.png" width="200" />
<img src="/apps/web/public/screen/mobile/3.png" width="200" />
<img src="/apps/web/public/screen/mobile/4.png" width="200" />

---

## Технологии

Frontend:

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn-style UI components.

Backend и bot runtime:

- Node.js;
- TypeScript;
- PostgreSQL;
- Prisma;
- Redis;
- Redis Streams;
- BullMQ;
- Docker Compose.

Интеграции:

- Telegram Bot API;
- Google Calendar OAuth/API;
- Microsoft Calendar architecture;
- YooKassa / Telegram Payments.

Engineering:

- OpenAPI;
- GitHub Actions;
- structured logging;
- Prometheus-compatible metrics;
- Vector logging config;
- ADR;
- backup scripts;
- unit, integration и e2e test structure.

---

## Структура проекта

```txt
Metrix/
├── apps/
│   ├── web/                         # Next.js web app
│   └── bot/                         # Telegram bot microservices runtime
│       ├── services/
│       │   ├── bot-gateway/
│       │   ├── booking-service/
│       │   ├── calendar-service/
│       │   ├── payment-service/
│       │   ├── analytics-service/
│       │   ├── admin-service/
│       │   ├── notification-service/
│       │   └── worker-service/
│       ├── packages/
│       │   ├── auth/
│       │   ├── contracts/
│       │   ├── health/
│       │   ├── observability/
│       │   ├── redis-bus/
│       │   ├── audit-log/
│       │   └── rbac/
│       ├── prisma/
│       └── docker-compose.yml
├── packages/
│   ├── api/                         # shared backend modules/contracts
│   ├── shared/
│   └── ui/
├── prisma/                          # root Prisma schema and migrations
├── docs/                            # architecture, API, testing, operations
├── monitoring/                      # alert rules and logging collector config
├── scripts/                         # backup and validation scripts
└── tests/                           # unit, integration, e2e tests
```

---

## Быстрый старт

### Web

```bash
npm install
npm run dev:web
```

### Telegram bot runtime

```bash
cd apps/bot
cp .env.example .env
npm install
npm run dev
```

`npm run dev` внутри `apps/bot` запускает Docker Compose с PostgreSQL, Redis, PgBouncer и bot services.

Минимальная проверка после запуска:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics
```

Подробный порядок запуска и env-файлы описаны в [Deployment runbook](./docs/deployment/README.md).

---

## Проверки

Root:

```bash
npm run prisma:validate
npm run typecheck
npm test
npm run openapi:validate
npm run verify
```

Bot workspace:

```bash
npm --prefix apps/bot install
npm --prefix apps/bot run build
```

Web:

```bash
npm --prefix apps/web install
npm --prefix apps/web run typecheck
```

CI выполняет Prisma validate, API typecheck, tests, OpenAPI validation, bot workspace build, web typecheck и dependency audit. См. [.github/workflows/ci.yml](./.github/workflows/ci.yml).

---

## Документация

Главные документы:

- [Documentation overview](./docs/README.md);
- [Engineering system report](./docs/REPORT.md);
- [Architecture overview](./docs/architecture/README.md);
- [Security architecture](./docs/architecture/SECURITY.md);
- [API contracts](./docs/architecture/API_CONTRACTS.md);
- [OpenAPI](./docs/openapi/README.md);
- [Queues and events](./docs/architecture/QUEUES_AND_EVENTS.md);
- [Observability](./docs/architecture/OBSERVABILITY.md);
- [Production readiness](./docs/architecture/PRODUCTION_READINESS.md);
- [Backup strategy](./docs/architecture/BACKUP_STRATEGY.md);
- [Testing evidence](./docs/testing/README.md);
- [Architecture decisions](./docs/decisions/README.md);
- [Deployment runbook](./docs/deployment/README.md).

Telegram bot:

- [Bot block](./docs/telegram-bot/bot-block.md);
- [Commands block](./docs/telegram-bot/commands-block.md);
- [Services block](./docs/telegram-bot/services-block.md);
- [Calendar integrations](./docs/telegram-bot/calendar-integrations.md);
- [Reports block](./docs/telegram-bot/reports-block.md);
- [Operations and security](./docs/telegram-bot/operations.md);
- [Telegram bot diagrams](./docs/telegram-bot-diagrams/README.md).

---

## Текущий статус

Сделано:

- web preview и адаптивные страницы;
- Telegram bot flow для бронирований, оплаты, просмотра броней, админки и аналитики;
- микросервисы для booking, calendar, payment, analytics, admin, notification и workers;
- Redis-backed rate limit, replay protection, locks, idempotency и queues;
- HMAC service-to-service auth и signed user identity;
- Google Calendar OAuth/token encryption lifecycle;
- payment holds, saga recovery и admin retry endpoints;
- audit log, RBAC package, DLQ replay docs и operator endpoints;
- OpenAPI spec, typed contracts, CI и test structure;
- docs по architecture, security, deployment, testing, backup и production readiness.

Осталось усилить:

- реальные load test results и p95/p99 evidence;
- observability screenshots из Prometheus/Grafana/logs;
- Docker healthchecks для всех application services;
- единый error catalog;
- отдельные SLO/SLA и incident simulation reports;
- Git hooks для локального quality gate.

Подробная оценка: [Engineering System Report](./docs/REPORT.md).

---

## Команда

Проект разработан с фокусом на системный дизайн, reliability, maintainability, operational thinking и понятный пользовательский опыт.
