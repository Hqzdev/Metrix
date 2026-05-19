Redis Outage Runbook

Этот runbook описывает действия при отказе Redis.

Impact

Redis outage влияет на queues, retry, DLQ, rate limit, replay protection, Telegram idempotency, FSM state и slot locks.
Система должна fail closed для safety-critical flows.

Detection

`/ready` возвращает 503.
В logs есть Redis connection errors.
`metrix_redis_stream_lag` перестаёт обновляться или растёт после восстановления.
Telegram updates начинают повторяться.
DLQ может начать пополняться после восстановления.

Immediate actions

1. Остановить ручной DLQ replay.
2. Не выполнять payment или booking recovery вручную без проверки PostgreSQL.
3. Проверить provider status или container status Redis.
4. Проверить REDIS_URL и REDIS_PASSWORD.
5. Восстановить Redis.
6. Дождаться зелёного `/ready`.

Verification

1. Проверить `/ready` у bot-gateway, booking-service, payment-service, analytics-service и admin-service.
2. Проверить, что новые Telegram updates не обрабатываются дублями.
3. Проверить stream lag.
4. Проверить `GET /dlq/streams`.
5. Проверить payment recovery queue, если outage совпал с оплатами.

Rollback / mitigation

Если Redis нестабилен, оставить write flows недоступными.
Не отключать replay protection, rate limit или slot locks ради восстановления UX.
Если потеря Redis state привела к спорному payment/booking case, использовать PaymentSaga recovery flow.

Residual risk

Telegram может повторить старые updates.
Pending stream messages могут требовать retry или DLQ replay.
FSM sessions могли истечь или потерять progress, пользователь должен начать flow заново.

Связанные документы

docs/operations/failure-scenarios.md
docs/architecture/CACHING_STRATEGY.md
docs/architecture/RETRY_STRATEGY.md
docs/architecture/DLQ_REPLAY.md
