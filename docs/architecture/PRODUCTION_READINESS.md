Production Readiness

Этот документ разбивает production-grade улучшения Metrix на задачи.
Он нужен, чтобы команда развивала системные свойства проекта постепенно и не смешивала observability, безопасность, очереди и деплой в одну большую задачу.

Назначение

Production readiness означает, что система не только выполняет happy path, но и умеет наблюдаться, восстанавливаться, ограничивать риски и безопасно развиваться.

Главный вопрос для каждой задачи:

что произойдёт, если сервис упадёт, запрос придёт дважды, Redis станет медленным, deploy начнётся во время бронирования или пользователь повторит действие.

Статусы

done — реализовано в коде и описано в документации
in progress — начато, но требует расширения или подключения во все сервисы
planned — задача описана и готова к реализации
evidence pending — процедура описана, но реальный runtime drill ещё не выполнен

1. Observability

Статус: in progress

Уже есть:

@metrix/observability package
/metrics wrapper for bot HTTP services
/ready checks for PostgreSQL и Redis
graceful shutdown helper для HTTP-сервисов

Задачи:

1. подключить Redis stream lag metrics для consumers
2. добавить requestId в HTTP metrics/log bridge
3. добавить тесты на формат /metrics и /ready
4. подключить future monitoring stack к /metrics

Критерии готовности:

каждый HTTP-сервис отдаёт /health, /ready и /metrics
метрики можно читать Prometheus-compatible scraper
ошибки и latency видны без ручного чтения логов

1.1 Observability Dashboard Screenshots

Статус: planned

Уже есть:

docs/testing/screenshots/README.md
monitoring/rules/metrix-alerts.yml
monitoring/logging/vector.toml
список обязательных screenshots для Prometheus, Grafana, logs и /metrics endpoints

Задачи:

1. поднять monitoring stack
2. снять реальные screenshots Prometheus targets и alerts
3. снять реальные screenshots Grafana overview и latency panels
4. снять реальные screenshots JSON logs через Vector или выбранный logs viewer
5. снять реальные screenshots /metrics endpoints для сервисов

1.2 Docker Healthchecks

Статус: done

Уже есть:

healthcheck для PostgreSQL
healthcheck для Redis
Docker healthcheck для bot-gateway
Docker healthcheck для booking-service
Docker healthcheck для payment-service
Docker healthcheck для calendar-service
Docker healthcheck для analytics-service
Docker healthcheck для admin-service

Критерии готовности:

application healthcheck проверяет `/ready`, а не только открытый порт
infrastructure healthcheck остаётся на native command provider

2. Structured Logging

Статус: in progress

Уже есть:

сервисы пишут JSON logs
логи содержат service, message, level и timestamp
ошибки сериализуются как объект

Задачи:

1. унифицировать logger interface между сервисами
2. добавить requestId в каждый HTTP log
3. добавить action для всех бизнес-событий
4. вынести общий logger helper после стабилизации формата

3. Distributed Tracing

Статус: in progress

Уже есть:

traceparent header в service-to-service auth headers
создание traceparent если входящий запрос пришёл без trace context
OBSERVABILITY.md описывает lightweight propagation

Задачи:

1. выбрать OpenTelemetry SDK для Node.js
2. добавить traceId/spanId в logs
3. прокидывать traceparent между сервисами
4. подключить Jaeger или OTLP collector в docker-compose

Критерии готовности:

один запрос Telegram виден как цепочка bot-gateway, booking-service, payment-service, notification-service.

4. Queues, Retry и DLQ

Статус: in progress

Уже есть:

Redis Streams
consumer groups
pending list
retryPending
DLQ stream
retryPending interval для active consumers
consumer lag metrics через metrix_redis_stream_lag
DLQ_REPLAY.md
admin-service endpoints GET /dlq и POST /dlq/replay
admin-service endpoint GET /dlq/streams для operator screen
persistent audit dlq.replayed

Задачи:

1. добавить тест на перенос сообщения в DLQ
2. добавить browser UI поверх operator endpoints
3. расширить notification-service metrics endpoint или отдельный worker metrics runtime

4.1 Retry Strategy Documentation

Статус: done

Уже есть:

docs/architecture/RETRY_STRATEGY.md
attempts по Redis Streams flows
backoff policy по Redis Streams и BullMQ reminders
jitter policy
DLQ threshold по каждому stream flow
idempotency keys для payment и reminder flows

Правило расширения:

каждый новый queue или stream flow должен добавить attempts, backoff, jitter, DLQ и idempotency key в RETRY_STRATEGY.md.

5. API Versioning

Статус: in progress

Уже есть:

public /api/v1 rule в API_CONTRACTS.md
API_VERSIONING.md
breaking change rules
deprecation window rules
internal apps/bot compatibility rule

Задачи:

1. реализовать public /api/v1 boundary при появлении новых web API routes
2. добавить migration notes при первой /api/v2
3. добавить contract tests для public clients
4. добавить deprecation headers для deprecated public routes

6. RBAC

Статус: in progress

Уже есть:

web API различает admin и employee
bot-gateway проверяет ADMIN_TELEGRAM_IDS для admin-команд
@metrix/rbac package
Telegram actor получает роли admin/employee через ADMIN_TELEGRAM_IDS
bot-gateway admin-команды проверяют permission admin:read
bot-gateway пишет rbac.denied structured log для отказов

Задачи:

1. заменить оставшиеся точечные admin-проверки на policy helpers
2. добавить persistent audit для отказов авторизации, если появится actor context в admin-service
3. покрыть permissions unit-тестами
4. синхронизировать web API requireAdmin с общей RBAC моделью

6.1 Persistent Audit

Статус: in progress

Уже есть:

AuditLog model в apps/bot/prisma/schema.prisma
@metrix/audit-log package
persistent audit для admin location/resource updates
persistent audit для booking cancel/forbidden events
persistent audit для payment transitions
persistent audit для calendar connect/disconnect
GET /audit-logs endpoint в admin-service
AUDIT_LOG_POLICY.md с redaction и retention policy
cursor pagination для audit query endpoint
scheduled cleanup job для audit retention

Задачи:

1. добавить тест на запись AuditLog при booking.created
2. добавить метрику удалённых audit records
3. добавить incident hold для audit records, связанных с открытым incident
4. добавить replay reason и actorUserId для DLQ replay audit

7. CI/CD

Статус: in progress

Уже есть:

GitHub Actions workflow .github/workflows/ci.yml
api job запускает Prisma validate, API typecheck и tests
bot job собирает workspace services/packages
web job запускает typecheck
docker job собирает bot service images
security job запускает npm audit для root, bot и web dependencies

Задачи:

1. выбрать policy для audit failures: blocking или non-blocking на pull request
2. добавить deploy job после выбора hosting target

7.1 Monorepo Tooling

Статус: done

Уже есть:

root npm scripts для build, typecheck, test, openapi validate и verify
apps/bot npm workspaces для packages/* и services/*
docs/architecture/MONOREPO_TOOLING.md
описание, почему npm workspaces достаточно до появления affected graph или remote cache

Правило расширения:

если root checks станут слишком медленными или появится потребность в affected graph, добавить ADR перед внедрением Turbo/Nx.

7.2 Git Hooks

Статус: done

Уже есть:

husky в root devDependencies
.husky/pre-commit
.husky/pre-push
npm run hook:pre-commit
npm run hook:pre-push

Проверки:

pre-commit запускает lint, typecheck:api и typecheck:web
pre-push запускает tests и openapi validate

7.3 CI Badges And Quality Gates

Статус: done

Уже есть:

README.md содержит CI badge
README.md содержит TypeScript badge
README.md содержит OpenAPI badge
README.md содержит quality gates badge
.github/workflows/ci.yml проверяет Prisma, typecheck, tests, OpenAPI, bot build, web typecheck и npm audit
docker build job собирает service images через apps/bot/Dockerfile.service

Правило расширения:

новый required check должен быть отражён в README quality gates или отдельном badge.

8. Security Hardening

Статус: in progress

Уже есть:

HMAC service-to-service auth
replay protection
user identity signature
Redis password
Redis dangerous commands disabled
field whitelist для admin updates
path traversal protection для notification-service
security headers в apps/web/next.config.mjs
CORS policy описана в SECURITY_HEADERS_AND_CORS.md
dual-read режим TRUSTED_*_SECRET_NEXT для service secret rotation

Задачи:

1. усилить CSP через nonce/hash после проверки UI
2. добавить preflight tests если появится public API
3. добавить secret scanning provider
4. добавить security headers regression tests

9. Backup Strategy

Статус: in progress

Уже есть:

BACKUP_STRATEGY.md
scripts/backup-postgres.sh
npm run db:backup
backups/ исключён из git

Задачи:

1. автоматизировать restore drill
2. добавить scheduled backup для production provider
3. добавить backup encryption на storage уровне
4. добавить retention cleanup job

10. OpenAPI

Статус: in progress

Уже есть:

docs/openapi/metrix-bot-api.yaml
docs/openapi/README.md
docs/openapi/PREVIEW.md
HMAC service-to-service security scheme
runtime endpoints /health, /ready и /metrics
основные booking, payment, analytics и admin routes
admin audit log route GET /audit-logs
lightweight validation script scripts/validate-openapi.mjs
contract tests для public TypeScript contracts и OpenAPI markers

Задачи:

1. добавить calendar-service domain routes после стабилизации OAuth API
2. заменить lightweight validation на Spectral или Redocly
3. синхронизировать OpenAPI с будущим /api/v1 public API
4. добавить static API docs runtime после выбора preview tool

10.0 Typed API Contracts

Статус: done

Уже есть:

apps/bot/packages/contracts
packages/api/src/contracts
docs/openapi/metrix-bot-api.yaml
scripts/validate-openapi.mjs
tests/unit/api/public-contracts.test.ts

Критерии готовности:

public client shapes проверяются TypeScript satisfies fixtures
OpenAPI spec проверяется на ключевые public paths и schemas

10.1 Error Catalog

Статус: in progress

Уже есть:

docs/architecture/ERROR_CATALOG.md
typed contracts в apps/bot/packages/contracts
OpenAPI ErrorResponse
service error classes в admin-service, payment-service и calendar-service

Задачи:

1. добавить code в базовые service error classes
2. вернуть `{ error, code }` из handleError
3. обновить OpenAPI ErrorResponse
4. добавить contract tests на стабильные error codes

11. Payments And Slot Holds

Статус: in progress

Уже есть:

SlotHold в payment schema
active hold на resourceId + slotId
pre-checkout проверяет hold
expired hold cleaner в payment-service
PaymentSaga создаётся вместе с invoice
booking после оплаты получает idempotency key payment:{invoiceId}
PAYMENT_COMPLETED consumer использует retryPending
PendingInvoice больше не удаляется после успешной оплаты
compensation endpoint для failed PaymentSaga
admin recovery queue endpoint GET /payment-sagas?status=recovery
admin inspect endpoint для PaymentSaga
admin retry-booking endpoint для failed или awaiting_booking PaymentSaga
admin mark-compensated endpoint для завершённой внешней компенсации
transactional audit для payment transitions

Задачи:

1. покрыть race-condition тестом два invoice на один slot
2. добавить browser UI поверх compensation queue endpoint

11.1 Failure Scenarios

Статус: done

Уже есть:

docs/operations/failure-scenarios.md
runbook для Redis down
runbook для PostgreSQL down
runbook для Telegram down
runbook для duplicate payment callback
сводная таблица impact -> detection -> mitigation -> residual risk

Правило расширения:

новые critical alerts должны ссылаться на конкретный failure scenario или добавлять новый сценарий в docs/operations.

12. Telegram Gateway State

Статус: in progress

Уже есть:

processed update key в Redis
polling offset в Redis
SET NX EX для защиты от повторной обработки update
монотонное сохранение offset через Lua script
stop signal для graceful shutdown polling loop
webhook mode для bot-gateway
POST /telegram/webhook endpoint
Telegram setWebhook с secret_token
проверка X-Telegram-Bot-Api-Secret-Token
метрика metrix_telegram_duplicate_updates_total

Задачи:

1. добавить тест на повторный Telegram update
2. добавить AbortSignal timeout для быстрого завершения getUpdates

13. Telegram User FSM

Статус: in progress

Уже есть:

User session state в Redis
FSM states START, SELECT_LOCATION, SELECT_ROOM, SELECT_TIME, CONFIRM_BOOKING, PAYMENT
TTL session — 1 час
state обновляется на /start, /book, выбор location/resource/slot и confirm payment
/resume восстанавливает UI по текущему FSM state
session version защищает optimistic updates от stale write

Задачи:

1. добавить тест на переходы FSM внутри Bot handler

14. Persistent Audit Log

Статус: in progress

Уже есть:

audit schema в PostgreSQL
AuditLog table
@metrix/audit-log package
booking.created persistent audit
booking.cancelled persistent audit
booking.cancel.forbidden persistent audit
invoice.created persistent audit
payment.completed persistent audit
payment.hold_expired persistent audit
payment.part_completed persistent audit
payment.booking_created persistent audit
payment.booking_failed persistent audit
payment.compensation_started persistent audit
location.updated persistent audit
resource.updated persistent audit
calendar.connected persistent audit
calendar.disconnected persistent audit
GET /audit-logs endpoint для admin-service
AUDIT_LOG_POLICY.md с redaction и retention policy
cursor pagination для audit query endpoint
scheduled cleanup job для audit retention

Задачи:

1. добавить тест на запись AuditLog при booking.created
2. добавить метрику удалённых audit records
3. добавить incident hold для audit records, связанных с открытым incident
4. добавить replay reason и actorUserId для DLQ replay audit

15. Connection Pooling

Статус: done

Уже есть:

PgBouncer service в apps/bot/docker-compose.yml
runtime DATABASE_URL у Prisma-сервисов указывает на pgbouncer:6432
db-init использует прямое подключение к postgres:5432
DEPLOYMENT.md описывает runtime и migration DATABASE_URL

Критерии готовности:

runtime-сервисы не открывают прямые соединения к PostgreSQL
migration/schema операции не идут через transaction pool
pooler не проброшен наружу Docker network

16. Migration Strategy

Статус: done

Уже есть:

Prisma migrations
docs/architecture/DATABASE_SCHEMA.md
docs/architecture/BACKUP_STRATEGY.md
production hardening SQL
docs/architecture/ZERO_DOWNTIME_MIGRATIONS.md

Критерии готовности:

expand/contract описан
backfill policy описана
rollback policy описана
deploy order описан

17. Rate Limit Strategy

Статус: done

Уже есть:

bot-gateway/src/rate-limiter.ts
Redis fixed window
10 requests / 10 seconds per Telegram user
docs/architecture/SECURITY.md
docs/architecture/RATE_LIMIT_STRATEGY.md
таблица лимитов по guest, admin и internal traffic

Критерии готовности:

guest Telegram user limit описан
admin Telegram user limit описан
internal service policy описана
future public web limits отмечены как planned

18. Caching Strategy

Статус: done

Уже есть:

Redis locks
Redis replay protection
Redis idempotency
Redis rate limit
Redis queues
docs/architecture/CACHING_STRATEGY.md

Критерии готовности:

описано что хранится в Redis
описаны TTL
описана invalidation policy
описано что запрещено кешировать

19. Backup Restore Drill Evidence

Статус: evidence pending

Уже есть:

docs/architecture/BACKUP_STRATEGY.md
scripts/backup-postgres.sh
npm run db:backup
RPO/RTO
restore drill procedure
docs/testing/RESTORE_DRILL_EVIDENCE.md

Задачи:

1. выполнить pg_restore в clean database
2. заполнить Restore result
3. приложить screenshot или log

20. Incident Simulation

Статус: planned

Уже есть:

docs/testing/PRODUCTION_READINESS_TEST_REPORT.md
docs/testing/INCIDENT_DRILL_EVIDENCE.md
сценарий analytics down
сценарий Redis down
сценарий payment retry
сценарий DLQ replay

Задачи:

1. поднять runtime окружение
2. провести incident drill
3. заполнить Actual для каждого сценария
4. приложить logs, metrics или screenshots

21. SLO/SLA

Статус: done

Уже есть:

docs/operations/SLO.md
availability SLO
p95 latency SLO
error budget policy
alert thresholds

Правило расширения:

SLA не объявляется наружу до появления production договора и публичного статуса сервиса.

22. Technical Debt

Статус: done

Уже есть:

docs/TECHNICAL_DEBT.md
owner
risk
mitigation
due date

Правило расширения:

technical debt item закрывается только после изменения кода или evidence документа.

23. Production Checklist Evidence

Статус: evidence pending

Уже есть:

docs/architecture/PRODUCTION_READINESS.md
docs/testing/PRODUCTION_READINESS_TEST_REPORT.md
evidence placeholders для Docker, CI, observability, DLQ, backup и monitoring

Задачи:

1. запустить Docker runtime
2. дождаться CI result
3. заполнить evidence fields
4. приложить screenshots/logs

24. Runbooks

Статус: done

Уже есть:

docs/deployment/README.md
docs/architecture/SECRET_ROTATION.md
docs/architecture/BACKUP_STRATEGY.md
docs/architecture/DLQ_REPLAY.md
docs/operations/redis-outage.md
docs/operations/db-restore.md
docs/operations/dlq-replay.md
docs/operations/failed-deploy-rollback.md

Критерии готовности:

Redis outage runbook создан
DB restore runbook создан
DLQ replay runbook создан
failed deploy rollback runbook создан

Порядок реализации

1. Observability, readiness, graceful shutdown
2. CI
3. queue retry scheduler и DLQ tests
4. OpenAPI
5. RBAC policies
6. tracing
7. backups и alerts

Правило расширения

Каждая production-задача должна обновлять код и документацию вместе.
Если задача меняет runtime-поведение сервиса, нужно обновить DEPLOYMENT.md или отдельный документ рядом.
Если задача меняет безопасность, нужно обновить SECURITY.md.
Если задача меняет очереди, нужно обновить QUEUES_AND_EVENTS.md.
