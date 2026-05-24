<img src="apps/web/public/images/banner.png" alt="Metrix" />

# Metrix

Metrix is a coworking and office-resource booking platform with a Next.js web
app, a Telegram bot, and a microservice backend for booking, payments,
calendar sync, analytics, audit, and operations.

[Website](https://metrixplatform.vercel.app) · [Docs](./docs/README.md) · [OpenAPI](./docs/openapi/README.md) · [Engineering Report](./docs/REPORT.md)

![CI](https://github.com/Hqzdev/Metrix/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-green)
![Quality gates](https://img.shields.io/badge/quality%20gates-typecheck%20%7C%20tests%20%7C%20openapi%20%7C%20audit-informational)

## What Metrix Does

Metrix replaces manual coworking coordination in chats and spreadsheets with a
single booking flow:

- users book desks, private offices, and meeting rooms from web or Telegram;
- admins manage resources, availability, pricing, and operational recovery;
- payments use Telegram/YooKassa-style invoice and saga flows;
- calendars can connect to external providers;
- analytics exposes utilization, summary stats, and reports;
- backend services communicate through signed requests, Redis, and typed contracts.

The repository is intentionally production-oriented: it includes API contracts,
OpenAPI, audit log, RBAC, Redis Streams, DLQ recovery, health/readiness checks,
observability helpers, security docs, runbooks, and test structure.

## Main Parts

```txt
apps/web
  Next.js 16 web app, booking UI, marketing pages, shared UI components.

apps/bot
  Telegram bot runtime and backend microservices.

apps/bot/services
  bot-gateway, booking-service, payment-service, calendar-service,
  analytics-service, admin-service, notification-service, worker-service.

apps/bot/packages
  audit-log, auth, contracts, health, observability, redis-bus, rbac.

packages/api
  Root shared API package.

docs
  Architecture, operations, OpenAPI, testing, deployment, and decisions.

tests
  Unit, integration, and e2e test suites.
```

## Architecture

```txt
Telegram / Web
  -> bot-gateway / web app
  -> booking-service
  -> payment-service
  -> calendar-service
  -> analytics-service
  -> admin-service
  -> PostgreSQL + Redis
```

Core infrastructure:

- PostgreSQL for persistent domain data;
- Prisma for schema and database access;
- Redis for locks, queues, idempotency, rate limits, replay protection, and DLQ;
- Redis Streams for event flow and retry/recovery paths;
- Docker Compose for local bot-service runtime;
- OpenAPI and TypeScript contracts for service boundaries.

Useful docs:

- [System overview](./docs/architecture/SYSTEM_OVERVIEW.md)
- [Architecture diagrams](./docs/architecture/DIAGRAMS.md)
- [Security](./docs/architecture/SECURITY.md)
- [Queues and events](./docs/architecture/QUEUES_AND_EVENTS.md)
- [Observability](./docs/architecture/OBSERVABILITY.md)
- [Production readiness](./docs/architecture/PRODUCTION_READINESS.md)

## Web App

`apps/web` is the public product surface. It contains the landing page,
booking explorer, company/resource/legal pages, and a categorized component
system.

Component layout:

```txt
apps/web/components
  booking      Booking-specific UI.
  landing      Landing composition and section modules.
  layout       Cross-page shells, headers, footer.
  media        Image/media helpers.
  metrics      Visual metric helpers.
  pages        Reusable page templates.
  providers    Client providers and initializers.
  ui           Low-level primitives grouped by purpose.
```

`components/ui` is split by responsibility:

- `actions`
- `data-display`
- `feedback`
- `forms`
- `hooks`
- `layout`
- `navigation`
- `overlays`

Large primitives keep a stable import file and move internals into an adjacent
folder. Example: `components/ui/layout/sidebar.tsx` re-exports smaller modules
from `components/ui/layout/sidebar/*`.

## Telegram Bot And Services

`apps/bot` is a microservice runtime, not a single bot script.

Runtime services:

- `bot-gateway` receives Telegram updates and handles public bot flow;
- `booking-service` owns locations, resources, slots, bookings, locks, and idempotency;
- `payment-service` owns invoices, payment holds, and compensation/retry saga logic;
- `calendar-service` owns provider connections and encrypted calendar tokens;
- `analytics-service` owns stats, summaries, and reports;
- `admin-service` exposes privileged operator endpoints, audit views, DLQ replay, and saga recovery;
- `notification-service` sends Telegram notifications;
- `worker-service` processes background work.

Shared packages:

- `audit-log` persistent audit log helpers;
- `auth` service-to-service HMAC auth, signed user identity, request body helpers;
- `contracts` public TypeScript contracts and validation;
- `health` health/readiness response helpers;
- `observability` metrics, observed handlers, graceful shutdown, trace context helpers;
- `redis-bus` Redis Streams event bus and DLQ utilities;
- `rbac` role and permission checks.

Bot docs:

- [Bot block](./docs/telegram-bot/bot-block.md)
- [Commands block](./docs/telegram-bot/commands-block.md)
- [Services block](./docs/telegram-bot/services-block.md)
- [Operations and security](./docs/telegram-bot/operations.md)

## Quick Start

Install from the repository root:

```bash
npm install
```

Run the web app:

```bash
npm run dev:web
```

Run the bot runtime:

```bash
cd apps/bot
cp .env.example .env
npm install
npm run dev
```

`apps/bot` uses Docker Compose for PostgreSQL, Redis, PgBouncer, and services.
See [deployment docs](./docs/deployment/README.md) for environment variables
and operational startup details.

## Common Commands

Root commands:

```bash
npm run dev:web
npm run dev:bot
npm run prisma:validate
npm run typecheck
npm test
npm run openapi:validate
npm run verify
```

Web-only:

```bash
npm --prefix apps/web run dev
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

Bot-only:

```bash
npm --prefix apps/bot run typecheck
npm --prefix apps/bot run build
npm --prefix apps/bot run db:generate
```

## Quality Gates

Local hooks are configured around:

```bash
npm run hook:pre-commit
npm run hook:pre-push
```

Pre-commit:

- API typecheck;
- web typecheck.

Pre-push:

- `npm audit --audit-level=high`;
- test suite;
- OpenAPI validation.

Some integration and e2e tests are placeholders unless the required services
are running with the expected environment flags.

## API And Contracts

The public bot/service API is documented in:

- [OpenAPI overview](./docs/openapi/README.md)
- [OpenAPI YAML](./docs/openapi/metrix-bot-api.yaml)
- [API contracts](./docs/architecture/API_CONTRACTS.md)

Typed contracts live in `apps/bot/packages/contracts` and should be updated
with service API changes.

## Operations

Operational capabilities included in the repository:

- `/health`, `/ready`, and `/metrics` helpers;
- structured JSON logging;
- traceparent propagation helpers;
- Redis replay protection and request idempotency;
- DLQ streams and admin replay endpoints;
- audit log persistence;
- RBAC package;
- backup scripts and backup strategy docs;
- deployment and production readiness docs.

Key docs:

- [Deployment runbook](./docs/deployment/README.md)
- [Backup strategy](./docs/architecture/BACKUP_STRATEGY.md)
- [Testing evidence](./docs/testing/README.md)
- [Architecture decisions](./docs/decisions/README.md)

## Repository Rules

- Keep service boundaries explicit: shared logic belongs in `apps/bot/packages/*`.
- Keep route files thin; reusable page and UI composition belongs in `apps/web/components`.
- Keep UI primitives grouped by category under `components/ui`.
- Prefer small focused files. For large primitives, keep the public entry file
  stable and move implementation details into a same-name folder.
- Update contracts, OpenAPI, and docs when changing service behavior.

## Status

Implemented:

- Next.js web app and booking UI;
- Telegram booking, payment, admin, analytics, and notification flows;
- microservices for booking, calendar, payment, analytics, admin, notification, and workers;
- shared bot packages for auth, contracts, health, observability, Redis bus, audit log, and RBAC;
- Redis locks, idempotency, rate limiting, replay protection, retries, and DLQ;
- OpenAPI, docs, tests, and local quality hooks.

Still worth strengthening:

- load-test evidence with p95/p99 data;
- production observability screenshots and dashboards;
- full Docker healthchecks for every application service;
- a single error catalog and incident simulation reports.
