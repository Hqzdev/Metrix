OpenAPI

Этот документ описывает папку docs/openapi.

Назначение

OpenAPI нужен, чтобы API-контракт был виден до чтения исходного кода.
Это снижает риск случайно сломать frontend, bot-gateway или внутренний сервис при изменении route handler.

Файлы

metrix-bot-api.yaml — контракт микросервисной части apps/bot
PREVIEW.md — как смотреть спецификацию через Swagger UI или Redoc

Что описывает спецификация

runtime endpoints:

GET /health
GET /ready
GET /metrics

booking-service:

GET /locations
GET /resources
GET /resources/{resourceId}
GET /slots
GET /bookings
POST /bookings
PATCH /bookings/{bookingId}
POST /slots/block
PATCH /locations/{locationId}
PATCH /resources/{resourceId}

payment-service:

POST /invoices
POST /pre-checkout
POST /successful-payment

analytics-service:

GET /stats
GET /summary
POST /reports
GET /reports/{reportId}

admin-service:

GET /bookings
GET /stats
GET /summary
GET /audit-logs
GET /dlq
POST /dlq/replay
PATCH /locations/{locationId}
PATCH /resources/{resourceId}
POST /reports
GET /reports/{reportId}

Правила обновления

Если меняется route, request body, response body или error format, нужно обновить OpenAPI в том же изменении.

Добавление endpoint:

1. добавить path в metrix-bot-api.yaml
2. описать requestBody
3. описать успешный response
4. описать ошибки
5. указать security
6. обновить API_CONTRACTS.md если меняется архитектурное правило

Правила security

Internal routes используют HMAC service-to-service headers:

X-Service-Name
X-Timestamp
X-Request-Id
X-Signature

Health, readiness и metrics не требуют HMAC внутри Docker network.
Публичный доступ к ним должен контролироваться infrastructure layer.

Versioning

Текущие internal routes остаются без префикса для совместимости сервисов.
Новые публичные HTTP API должны использовать /api/v1.

Validation

Команда:

npm run openapi:validate

Скрипт:

scripts/validate-openapi.mjs

Текущая проверка lightweight и не заменяет полноценный OpenAPI linter.
После выбора инструмента можно добавить Spectral или Redocly.

Preview

Локальный preview описан в PREVIEW.md.
