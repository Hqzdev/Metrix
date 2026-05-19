Error Catalog

Этот документ описывает canonical error codes для Metrix.
Сейчас часть сервисов возвращает только `{ error: string }`.
Каталог нужен, чтобы новые API и будущие версии OpenAPI постепенно переходили на стабильные machine-readable коды.

Назначение

Error code нужен для клиента, оператора и audit.
Текст ошибки можно менять.
Код ошибки должен оставаться стабильным в рамках публичного API versioning.

Формат будущего response

{
  "error": "slot is already booked",
  "code": "BOOKING_CONFLICT"
}

Правила

Код пишется в SCREAMING_SNAKE_CASE.
Код описывает доменную причину, а не имя класса.
Один HTTP status может иметь несколько error codes.
Не добавлять userId, bookingId, invoiceId или requestId в code.
requestId должен быть в logs или response metadata, но не в code.

Catalog

| Code | HTTP | Service | Meaning | Current source |
| --- | --- | --- | --- | --- |
| VALIDATION_FAILED | 400 | all services | Request body, params or query are invalid. | ValidationError |
| INVALID_SIGNATURE | 401 | admin-service, payment-service, calendar-service | HMAC signature or user identity signature is invalid. | AuthenticationError |
| REPLAY_DETECTED | 409 | admin-service, payment-service, calendar-service | Request nonce/timestamp was already used or is outside replay window. | ReplayAttackError |
| NOT_FOUND | 404 | all services | Requested resource does not exist or is not visible to actor. | NotFoundError |
| BOOKING_CONFLICT | 409 | booking-service, payment-service | Slot is already booked, held or cannot be reserved. | ConflictError, unique constraint P2002 |
| PAYMENT_HOLD_EXPIRED | 409 | payment-service | SlotHold expired before payment confirmation. | pre-checkout hold check |
| PAYMENT_AMOUNT_MISMATCH | 400 | payment-service | Telegram payment amount or currency does not match PendingInvoice. | pre-checkout validation |
| PAYMENT_SAGA_NOT_RECOVERABLE | 409 | payment-service | Operator action is not allowed for current PaymentSaga status. | compensate, retry-booking, mark-compensated |
| PROVIDER_NOT_CONFIGURED | 400 | calendar-service | Calendar provider is not configured for OAuth flow. | ProviderNotConfiguredError |
| INVALID_OAUTH_STATE | 400 | calendar-service | OAuth state is missing, expired or invalid. | OAuthStateError |
| UNSAFE_FILE_PATH | 400 | notification-service | Document path is outside allowed file boundary. | UnsafeFilePathError |
| TELEGRAM_API_FAILED | 502 | notification-service, bot-gateway | Telegram API returned an error or unavailable response. | TelegramApiError |
| DOWNSTREAM_SERVICE_FAILED | 502 | payment-service, bot-gateway | Internal service dependency returned unexpected failure. | DownstreamServiceError |
| RATE_LIMIT_EXCEEDED | 429 | bot-gateway, public API | Actor exceeded request or update rate limit. | rate-limiter |
| INTERNAL_ERROR | 500 | all services | Unhandled service error. | handleError fallback |

Implementation policy

Новые service errors должны принимать code рядом с message и statusCode.
OpenAPI ErrorResponse должен получить optional code перед тем, как code станет required.
Старые clients должны продолжать читать поле error.
Logs должны писать code вместе с action, service и requestId, когда requestId доступен.

Migration order

1. добавить code в базовые service error classes
2. вернуть `{ error, code }` из handleError
3. обновить OpenAPI ErrorResponse
4. добавить contract tests на стабильные codes
5. сделать code required только в следующей public API version

Связанные документы

docs/architecture/API_CONTRACTS.md
docs/architecture/API_VERSIONING.md
docs/openapi/metrix-bot-api.yaml
