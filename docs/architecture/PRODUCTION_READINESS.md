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
security job запускает npm audit для root, bot и web dependencies

Задачи:

1. выбрать policy для audit failures: blocking или non-blocking на pull request
2. добавить docker build job после стабилизации образов
3. добавить deploy job после выбора hosting target

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

Задачи:

1. добавить calendar-service domain routes после стабилизации OAuth API
2. заменить lightweight validation на Spectral или Redocly
3. синхронизировать OpenAPI с будущим /api/v1 public API
4. добавить static API docs runtime после выбора preview tool

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
