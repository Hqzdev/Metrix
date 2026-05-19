Production Readiness Test Report

Этот документ фиксирует, что нужно проверить после архитектурных изменений production-grade слоя Metrix.
Он нужен как checklist перед финальным запуском, build, CI и демонстрацией результата.

Назначение

В проект добавлены observability, retry/DLQ, audit, RBAC, OpenAPI, security hardening, backup, secret rotation и operational docs.
Часть изменений можно проверить только через запуск сервисов, Docker, тесты, CI или ручной сценарий.

Правила заполнения

После проверки каждого блока нужно заполнить:

дата
окружение
команда или сценарий
результат
ссылка на лог или скриншот
остаточный риск

Не удалять failed results.
Если проверка упала, оставить результат и добавить follow-up задачу.

Общий статус

Дата проверки:
Проверял:
Ветка или commit:
Окружение:
Итоговый статус:

Build и базовые проверки

Что проверить:

root install
bot install
web install
typecheck
unit tests
integration tests
OpenAPI validation
Docker compose config
Docker compose up

Команды:

```
npm ci
npm run typecheck
npm test
npm run openapi:validate
npm --prefix apps/bot install
npm --prefix apps/bot run build
npm --prefix apps/web install
npm --prefix apps/web run typecheck
docker compose -f apps/bot/docker-compose.yml up
```

Evidence:

Дата:
Команды:
Результат:
Ошибки:
Follow-up:

Скриншоты:

![Build result](./screenshots/production-build-result.png)
![Docker compose up](./screenshots/production-docker-compose-up.png)
![CI result](./screenshots/production-ci-result.png)

Observability

Что проверить:

GET /health для всех HTTP-сервисов
GET /ready для всех HTTP-сервисов
GET /metrics для всех HTTP-сервисов
metrix_http_requests_total увеличивается после запросов
metrix_http_request_duration_ms публикуется
metrix_redis_stream_lag появляется для stream consumers
graceful shutdown закрывает HTTP, Redis и Prisma

Evidence:

Дата:
Сервисы:
Health result:
Ready result:
Metrics result:
Shutdown result:
Follow-up:

Скриншоты:

![Health checks](./screenshots/production-health-checks.png)
![Readiness checks](./screenshots/production-readiness-checks.png)
![Metrics endpoint](./screenshots/production-metrics-endpoint.png)
![Graceful shutdown logs](./screenshots/production-graceful-shutdown.png)

Queues, Retry и DLQ

Что проверить:

consumer получает событие из Redis Stream
handler failure оставляет сообщение в pending
retryPending повторяет доставку
после превышения delivery count сообщение попадает в dlq:{stream}
GET /dlq возвращает DLQ сообщения
POST /dlq/replay возвращает payload в originalStream или targetStream
dlq.replayed пишется в audit log
consumer lag виден в metrics

Evidence:

Дата:
Stream:
Consumer group:
DLQ stream:
Replay result:
Audit result:
Follow-up:

Скриншоты:

![Redis stream pending](./screenshots/production-redis-pending.png)
![DLQ messages](./screenshots/production-dlq-messages.png)
![DLQ replay](./screenshots/production-dlq-replay.png)
![Stream lag metric](./screenshots/production-stream-lag.png)

Audit и RBAC

Что проверить:

booking.created пишется в AuditLog
booking.cancelled пишется в AuditLog
booking.cancel.forbidden пишется в AuditLog
payment transitions пишутся в AuditLog
calendar.connected и calendar.disconnected пишутся в AuditLog
location.updated и resource.updated пишутся в AuditLog
GET /audit-logs фильтрует по service/action/entity/requestId
GET /audit-logs возвращает nextCursor
cursor отдаёт следующую страницу
AUDIT_RETENTION_DAYS удаляет старые записи
не-admin Telegram user получает Access denied
rbac.denied появляется в structured log

Evidence:

Дата:
Audit events:
Audit query:
Cursor:
Retention cleanup:
RBAC denied:
Follow-up:

Скриншоты:

![Audit log rows](./screenshots/production-audit-log-rows.png)
![Audit query endpoint](./screenshots/production-audit-query.png)
![Audit cursor pagination](./screenshots/production-audit-cursor.png)
![RBAC denied log](./screenshots/production-rbac-denied.png)

Security

Что проверить:

service-to-service HMAC проходит с current secret
service-to-service HMAC проходит с TRUSTED_*_SECRET_NEXT
invalid signature возвращает 401
старый X-Request-Id возвращает 409 replay conflict
timestamp drift возвращает 401
X-User-Id проверяется через X-User-Sig
security headers есть в web response
CORS не открывает internal services
path traversal в notification-service отклоняется

Evidence:

Дата:
HMAC current:
HMAC next:
Replay protection:
User signature:
Headers:
CORS:
Path traversal:
Follow-up:

Скриншоты:

![HMAC success](./screenshots/production-hmac-success.png)
![HMAC next secret](./screenshots/production-hmac-next-secret.png)
![Replay protection](./screenshots/production-replay-protection.png)
![Security headers](./screenshots/production-security-headers.png)

Payments и idempotency

Что проверить:

invoice создаёт SlotHold
два invoice на один slot не проходят одновременно
pre-checkout проверяет active hold
successful-payment создаёт PaymentSaga
booking после оплаты использует idempotency key payment:{invoiceId}
повторный successful-payment не создаёт дубль booking
failed PaymentSaga доступна через admin recovery endpoints
compensation/retry/mark-compensated endpoints работают по сценарию

Evidence:

Дата:
Invoice:
Slot hold:
Double booking:
Payment saga:
Idempotency:
Recovery:
Follow-up:

Скриншоты:

![Invoice created](./screenshots/production-invoice-created.png)
![Slot hold](./screenshots/production-slot-hold.png)
![Payment saga recovery](./screenshots/production-payment-saga-recovery.png)
![Idempotency check](./screenshots/production-idempotency-check.png)

Telegram gateway

Что проверить:

polling offset сохраняется в Redis
повторный update пропускается
processed update key живёт с TTL
rate limit срабатывает
FSM state сохраняется в Redis
graceful shutdown останавливает polling loop
webhook mode проверяет secret_token, если включён

Evidence:

Дата:
Polling offset:
Duplicate update:
Rate limit:
FSM:
Shutdown:
Webhook:
Follow-up:

Скриншоты:

![Telegram start](./screenshots/production-telegram-start.png)
![Telegram booking](./screenshots/production-telegram-booking.png)
![Telegram duplicate update](./screenshots/production-telegram-duplicate-update.png)
![Telegram rate limit](./screenshots/production-telegram-rate-limit.png)

OpenAPI

Что проверить:

npm run openapi:validate проходит
Swagger UI preview открывается
Redoc preview открывается
/audit-logs описан
/dlq и /dlq/replay описаны
HMAC headers описаны
runtime endpoints описаны
admin/payment recovery endpoints описаны

Evidence:

Дата:
Validation:
Swagger:
Redoc:
Missing routes:
Follow-up:

Скриншоты:

![OpenAPI validation](./screenshots/production-openapi-validation.png)
![Swagger preview](./screenshots/production-swagger-preview.png)
![Redoc preview](./screenshots/production-redoc-preview.png)

Backup и restore

Что проверить:

npm run db:backup создаёт файл
backup не попадает в git
pg_restore поднимает данные в чистую БД
restore drill документирован
retention cleanup для backup описан или создан provider-side

Evidence:

Дата:
Backup file:
Restore result:
RPO/RTO:
Follow-up:

Скриншоты:

![Backup command](./screenshots/production-backup-command.png)
![Backup file](./screenshots/production-backup-file.png)
![Restore drill](./screenshots/production-restore-drill.png)

Restore drill evidence:

docs/testing/RESTORE_DRILL_EVIDENCE.md

Incident simulation

Что проверить:

analytics down
Redis down
payment retry
DLQ replay

Evidence:

Дата:
Окружение:
Analytics down:
Redis down:
Payment retry:
DLQ replay:
Follow-up:

Drill evidence:

docs/testing/INCIDENT_DRILL_EVIDENCE.md

CI/CD и dependency scanning

Что проверить:

GitHub Actions api job проходит
GitHub Actions bot job проходит
GitHub Actions web job проходит
GitHub Actions security job проходит или имеет approved exception
npm audit root
npm audit apps/bot
npm audit apps/web
policy для high vulnerabilities понятна

Evidence:

Дата:
CI run:
API job:
Bot job:
Web job:
Security job:
Audit exceptions:
Follow-up:

Скриншоты:

![GitHub Actions overview](./screenshots/production-github-actions.png)
![Security job](./screenshots/production-security-job.png)
![Audit result](./screenshots/production-npm-audit.png)

Monitoring и alerts

Что проверить:

Prometheus scrape читает /metrics
Grafana dashboard показывает HTTP requests
Grafana dashboard показывает latency
Grafana dashboard показывает Redis stream lag
alert на error rate срабатывает на тестовом условии
alert на stream lag срабатывает на тестовом условии
alert содержит ссылку на runbook

Evidence:

Дата:
Prometheus:
Grafana:
Error-rate alert:
Lag alert:
Runbook link:
Follow-up:

Скриншоты:

![Prometheus targets](./screenshots/production-prometheus-targets.png)
![Grafana dashboard](./screenshots/production-grafana-dashboard.png)
![Alertmanager alert](./screenshots/production-alertmanager-alert.png)

Tracing

Что проверить:

traceparent создаётся в исходящем service request
traceparent принимается downstream service
traceId попадает в structured logs
после подключения collector один flow виден как цепочка сервисов

Evidence:

Дата:
Traceparent headers:
Logs:
Collector:
Trace view:
Follow-up:

Скриншоты:

![Traceparent headers](./screenshots/production-traceparent-headers.png)
![Jaeger trace](./screenshots/production-jaeger-trace.png)

Итоговая таблица

Build:
Observability:
Queues/DLQ:
Audit/RBAC:
Security:
Payments:
Telegram:
OpenAPI:
Backup:
CI/CD:
Monitoring:
Tracing:

Открытые follow-up задачи

1.
2.
3.
4.
5.

Финальное решение

Готово к demo:
Готово к staging:
Готово к production:

Комментарий:
