Incident Drill Evidence

Этот документ фиксирует incident simulation для production readiness.
Не заполнять passed без реального запуска runtime и проверки logs, metrics или endpoint responses.

Общие поля

Дата:
Проверял:
Окружение:
Ветка или commit:
Runtime:
Итоговый статус:

Scenario 1. Analytics down

Цель:

проверить, что недоступность analytics-service не ломает booking/payment core flow и видна через readiness/alerts.

Шаги:

1. поднять apps/bot docker compose
2. остановить analytics-service
3. проверить `/ready` bot-gateway и admin-service
4. выполнить booking flow без analytics screen
5. проверить logs и metrics

Expected:

core booking flow работает
analytics endpoints недоступны или degraded
error виден в logs
ready/metrics показывают dependency state

Actual:

not executed in this turn

Scenario 2. Redis down

Цель:

проверить safe failure для rate limit, replay protection, queues и idempotency.

Шаги:

1. поднять apps/bot docker compose
2. остановить redis
3. проверить `/ready` сервисов
4. отправить Telegram update или internal request
5. проверить, что сервис не обходит safety-critical Redis checks

Expected:

ready становится unhealthy
unsafe flows отказываются
ошибка видна в structured logs

Actual:

not executed in this turn

Scenario 3. Payment retry

Цель:

проверить, что `stream:payment.completed` retry не создаёт duplicate booking.

Шаги:

1. создать PendingInvoice, SlotHold и PaymentSaga
2. опубликовать PAYMENT_COMPLETED
3. временно сломать booking-service response
4. дождаться retryPending
5. восстановить booking-service
6. проверить Booking и PaymentSaga

Expected:

PaymentSaga переходит в failed или awaiting recovery при ошибке
retry-booking использует idempotency key `payment:{invoiceId}`
создаётся не больше одного Booking

Actual:

not executed in this turn

Scenario 4. DLQ replay

Цель:

проверить перенос сообщения в DLQ и ручной replay через admin-service.

Шаги:

1. вызвать handler failure больше delivery threshold
2. проверить `dlq:{stream}`
3. открыть `GET /dlq/streams`
4. открыть `GET /dlq?stream={stream}`
5. вызвать `POST /dlq/replay`
6. проверить audit action `dlq.replayed`

Expected:

payload попадает в DLQ
operator endpoints показывают сообщение
replay возвращает payload в target stream
audit содержит `dlq.replayed`

Actual:

not executed in this turn

Связанные документы

docs/operations/failure-scenarios.md
docs/architecture/RETRY_STRATEGY.md
docs/architecture/DLQ_REPLAY.md
docs/architecture/PAYMENTS_AND_HOLDS.md
