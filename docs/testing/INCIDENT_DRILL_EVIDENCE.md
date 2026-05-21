Incident Drill Evidence

Этот документ фиксирует incident simulations.

Дата: 2026-05-19
Окружение: local Docker Compose

Analytics down

Что проверяли:

analytics-service остановлен.

Результат:

core services остались healthy.
bot-gateway /ready остался 200.
admin-service /ready остался 200.

Статус: passed.

Redis down

Что проверяли:

Redis остановлен.

Результат:

bot-gateway /ready вернул 503.
В logs появились Redis connection errors.
После восстановления Redis /ready снова вернул 200.

Статус: passed.

Payment retry

Что проверяли:

создана synthetic failed PaymentSaga.
Вызван signed retry-booking endpoint.

Результат:

endpoint вернул 200.
AuditLog содержит payment.booking_retry_requested.
Synthetic payload вернулся в failed из-за booking-service 404.

Статус: partial pass.

Follow-up:

повторить через настоящий invoice flow.

DLQ replay

Что проверяли:

создано synthetic DLQ message.
Вызван signed POST /dlq/replay.

Результат:

target stream получил сообщение.
AuditLog содержит dlq.replayed.

Статус: passed.
