# Engineering System Report

Дата: 2026-05-19

Этот отчет показывает, какие production-grade практики уже есть в Metrix, какие сделаны частично, а какие стоит добавить следующими. Цель отчета — отделить реальные артефакты проекта от будущих улучшений и показать систему как инженерный продукт, а не набор учебных модулей.

## Краткий вывод

Metrix уже выглядит как инженерная система: есть микросервисная архитектура, ADR, security model, HMAC service-to-service auth, replay protection, Redis locks, OpenAPI, CI, observability endpoints, structured logging, audit/RBAC, backup strategy, operational docs и sequence diagrams.

Главные пробелы сейчас не в коде happy path, а в доказательной базе:

- нагрузочные тесты пока оформлены как шаблон, но без результатов;
- screenshots для Grafana/Prometheus/logs пока placeholder, реальных изображений нет;
- Docker healthcheck есть для PostgreSQL и Redis, но не для всех application services;
- Git hooks не обнаружены;
- SLO/SLA и incident simulation описаны не как отдельные документы;
- error catalog есть частично через typed error responses, но нужен единый каталог кодов.

## Статус по 22 production-grade практикам

| Практика | Статус | Что уже есть | Что добавить |
| --- | --- | --- | --- |
| 1. ADR | Done | `docs/decisions/` содержит ADR по Redis, HMAC и разделению web/bot runtime. | Добавлять ADR на каждое крупное архитектурное решение. |
| 2. Threat model / security model | Done | `docs/architecture/SECURITY.md`, `docs/security/README.md`, HMAC, replay protection, user signature, OAuth state, encrypted Google tokens. | Вынести отдельную таблицу threat -> mitigation -> residual risk. |
| 3. Sequence diagrams | Done | `docs/architecture/DIAGRAMS.md` и `docs/telegram-bot-diagrams/*.mmd`. | Добавить диаграммы failure/retry flows для DLQ и payment recovery. |
| 4. Load testing | Planned | `docs/testing/load/README.md` содержит шаблон и первый сценарий конкурентного бронирования. | Добавить k6/autocannon scripts и реальные p50/p95/p99/error rate. |
| 5. Failure scenarios | Partial | `docs/architecture/PRODUCTION_READINESS.md`, `DLQ_REPLAY.md`, `PAYMENTS_AND_HOLDS.md`, backup/secret rotation docs. | Создать `docs/operations/failure-scenarios.md` с Redis down, DB down, Telegram down, payment callback duplicate. |
| 6. Observability dashboard screenshots | Planned | Есть `docs/testing/screenshots/README.md`, `monitoring/rules/metrix-alerts.yml`, `monitoring/logging/vector.toml`. | Добавить реальные screenshots Prometheus/Grafana/logs/metrics endpoints. |
| 7. Monorepo tooling | Partial | Root npm scripts, `apps/bot` npm workspaces для `packages/*` и `services/*`. | Если нужен enterprise perception — добавить Turborepo/Nx или явно описать почему достаточно npm workspaces. |
| 8. Git hooks | Missing | Не обнаружены `.husky`, `lint-staged` или hook config. | Добавить Husky: pre-commit lint/typecheck quick, pre-push tests/openapi validate. |
| 9. Error catalog | Partial | Есть typed contracts в `apps/bot/packages/contracts`, service errors и OpenAPI error response. | Создать `docs/architecture/ERROR_CATALOG.md` с кодами вроде `BOOKING_CONFLICT`, `INVALID_SIGNATURE`, `RATE_LIMIT_EXCEEDED`. |
| 10. Typed API contracts | Done | `apps/bot/packages/contracts`, `packages/api/src/contracts`, `docs/openapi/metrix-bot-api.yaml`, `scripts/validate-openapi.mjs`. | Добавить contract tests для публичных клиентов. |
| 11. Retry strategy documentation | Partial | `docs/architecture/QUEUES_AND_EVENTS.md`, `DLQ_REPLAY.md`, `PAYMENTS_AND_HOLDS.md`, BullMQ exponential backoff в reminder scheduler. | Вынести единый `RETRY_STRATEGY.md`: attempts, backoff, jitter, DLQ threshold по каждому потоку. |
| 12. Docker healthchecks | Partial | Healthcheck есть для PostgreSQL и Redis в `apps/bot/docker-compose.yml`; application services имеют `/health`, `/ready`, `/metrics`. | Добавить Docker `healthcheck` для bot-gateway, booking, payment, calendar, analytics, admin. |
| 13. CI badges + quality gates | Partial | `.github/workflows/ci.yml` проверяет Prisma, typecheck, tests, OpenAPI, bot build, web typecheck, npm audit. | Добавить badges в `README.md` и docker build job. |
| 14. Migration strategy | Partial | Prisma migrations есть, `docs/architecture/DATABASE_SCHEMA.md`, `BACKUP_STRATEGY.md`, production hardening SQL. | Добавить `ZERO_DOWNTIME_MIGRATIONS.md`: expand/contract, backfill, rollback, deploy order. |
| 15. Rate limit strategy | Done | `bot-gateway/src/rate-limiter.ts`, Redis fixed window, описано в security docs: 10 requests / 10 seconds per Telegram user. | Добавить отдельную таблицу лимитов по guest/admin/internal. |
| 16. Caching strategy | Partial | Redis используется для locks, replay, idempotency, rate limit, queues; в диаграмме есть short-lived cache. | Описать что именно кешируется, TTL, invalidation и что запрещено кешировать. |
| 17. Backup/recovery plan | Done | `docs/architecture/BACKUP_STRATEGY.md`, `scripts/backup-postgres.sh`, `npm run db:backup`, RPO/RTO и restore drill. | Добавить результат первого restore drill как evidence. |
| 18. Incident simulation | Planned | `docs/testing/PRODUCTION_READINESS_TEST_REPORT.md` задает сценарии проверки. | Провести и зафиксировать incident drill: analytics down, Redis down, payment retry, DLQ replay. |
| 19. SLO/SLA | Partial | Alerting и readiness описаны, p95 упоминается в testing/load template. | Создать `docs/operations/SLO.md`: availability, p95 latency, error budget, alert thresholds. |
| 20. Technical debt section | Partial | `docs/architecture/PRODUCTION_READINESS.md` содержит planned/in progress задачи и limitations. | Вынести короткий `docs/TECHNICAL_DEBT.md` с owner, risk, mitigation, due date. |
| 21. Production checklist | Done | `docs/architecture/PRODUCTION_READINESS.md` и `docs/testing/PRODUCTION_READINESS_TEST_REPORT.md`. | Заполнить evidence после реального запуска Docker/CI. |
| 22. Runbooks | Partial | `docs/deployment/README.md`, `docs/architecture/SECRET_ROTATION.md`, `BACKUP_STRATEGY.md`, `DLQ_REPLAY.md`. | Создать runbooks для Redis outage, DB restore, DLQ replay, failed deploy rollback. |

## Что уже особенно усиливает проект

1. **Security architecture не декоративная.** В проекте описаны и реализуются HMAC-подписи, защита от replay через Redis TTL, signed user identity, OAuth state signing, encryption Google tokens и service trust matrix.

2. **Есть operational thinking.** Документы про backup, secret rotation, DLQ replay, deployment, readiness и alerting показывают, что система проектируется вокруг отказов, а не только вокруг успешного сценария.

3. **Микросервисная часть не хаотичная.** Есть bot-gateway, booking, calendar, payment, analytics, admin, notification и worker services; зависимости описаны в docker-compose, внутренние сервисы скрыты через `expose`.

4. **Контракты и проверки уже встроены.** OpenAPI spec валидируется скриптом, CI запускает typecheck/tests/OpenAPI validation/audit, а контракты вынесены в shared packages.

5. **Есть база для observability.** Сервисы имеют `/health`, `/ready`, `/metrics`; есть Prometheus-style метрики, alert rules и Vector config для structured logs.

## Самые полезные следующие шаги

### P0: быстро поднять perception проекта

1. Добавить `docs/architecture/ERROR_CATALOG.md`.
2. Добавить `docs/architecture/RETRY_STRATEGY.md`.
3. Добавить `docs/operations/SLO.md`.
4. Добавить Docker healthchecks для application services.
5. Добавить README badges для CI, tests, OpenAPI.

Эти задачи дают большой визуальный и инженерный эффект при небольшом объеме изменений.

### P1: доказать production behavior

1. Написать k6/autocannon сценарий конкурентного бронирования одного слота.
2. Запустить load test и заполнить `docs/testing/load/README.md` реальными цифрами.
3. Запустить Docker compose и сохранить screenshots `/health`, `/ready`, `/metrics`.
4. Провести DLQ replay drill и добавить evidence в `PRODUCTION_READINESS_TEST_REPORT.md`.
5. Провести restore drill PostgreSQL backup.

### P2: усилить operational maturity

1. Добавить runbooks для Redis outage, DB outage, failed payment recovery, failed deploy rollback.
2. Добавить incident simulation report.
3. Подключить Grafana/Prometheus stack в compose или отдельный monitoring compose profile.
4. Добавить Git hooks через Husky/lint-staged.
5. Описать zero-downtime migration strategy.

## Рекомендуемая структура новых документов

```txt
docs/
  architecture/
    ERROR_CATALOG.md
    RETRY_STRATEGY.md
    CACHING_STRATEGY.md
    ZERO_DOWNTIME_MIGRATIONS.md
  operations/
    SLO.md
    failure-scenarios.md
    runbooks/
      redis-outage.md
      postgres-restore.md
      dlq-replay.md
      failed-deploy-rollback.md
  testing/
    load/
      booking-concurrency.k6.js
      results-2026-05-19.md
```

## Итоговая оценка

Текущий проект уже находится выше уровня "учебный CRUD": архитектурные решения задокументированы, security слой серьезный, runtime разделен на сервисы, есть Redis/Postgres/queues, CI и operational docs.

Чтобы довести восприятие до "production-grade portfolio project", сейчас важнее всего не добавлять еще больше фич, а закрыть доказательные артефакты: реальные load test results, screenshots observability, incident drills, runbooks и единые каталоги ошибок/retry/SLO.
