Retry Strategy

Этот документ описывает retry policy для Metrix.
Он нужен, чтобы retry, backoff, jitter и DLQ threshold не были разбросаны между Redis Streams, BullMQ, payment recovery и notification delivery.

Назначение

Retry должен восстанавливать временные сбои.
Retry не должен скрывать постоянную ошибку handler.
Retry не должен создавать дубли бронирований, платежей или уведомлений.

Общие правила

Каждый retry handler должен быть идемпотентным.
Каждый retry должен иметь верхний предел attempts.
После превышения attempts событие уходит в DLQ или recovery queue.
Replay из DLQ выполняется только вручную после диагностики.
Backoff нужен для внешних API и нестабильных downstream-сервисов.
Jitter добавляется, когда несколько workers могут одновременно повторить одинаковый вызов.

Сводная таблица

| Flow | Mechanism | Attempts | Backoff | Jitter | DLQ threshold | Idempotency |
| --- | --- | --- | --- | --- | --- | --- |
| `stream:payment.completed` | Redis Streams pending retry | 5 deliveries | fixed pending claim every 60s after 30s idle | none today | delivery count > 5 | `payment:{invoiceId}` |
| `stream:notification.send` | Redis Streams pending retry | 5 deliveries | fixed pending claim every 60s after 30s idle | none today | delivery count > 5 | event type + Telegram delivery state |
| `stream:booking.created` | Redis Streams pending retry | 5 deliveries | fixed pending claim every 60s after 30s idle | none today | delivery count > 5 | booking id |
| `stream:booking.cancelled` | Redis Streams pending retry | 5 deliveries | fixed pending claim every 60s after 30s idle | none today | delivery count > 5 | booking id |
| booking reminders | BullMQ | 3 attempts | exponential, 5s base delay | BullMQ default | failed jobs retained, no RedisBus DLQ | `reminder:{bookingId}` |
| payment saga booking recovery | operator action | manual | none | none | recovery queue status | `payment:{invoiceId}` |
| report export | BullMQ worker | implementation-specific | planned exponential | planned | failed report status | report id |

Redis Streams policy

RedisBus constants:

MAX_DELIVERY_ATTEMPTS = 5
PENDING_CLAIM_IDLE_MS = 30000
retryPendingIntervalMs = 60000 for active consumers

Алгоритм:

1. handler падает и сообщение остаётся pending
2. retry interval ищет pending messages старше idle threshold
3. RedisBus делает XCLAIM на текущего consumer
4. handler запускается повторно
5. успешный handler делает XACK
6. delivery count больше лимита переносит payload в `dlq:{stream}`

DLQ payload

data
originalStream
originalId
deliveryCount

Redis Streams jitter

Сейчас jitter не включён.
Это допустимо, потому что retryPending запускается внутри сервисов-владельцев consumer group, а не отдельным глобальным worker.
Если появится несколько replicas одного consumer group, добавить jitter 0-15 секунд перед XCLAIM interval.

Payment completed

Stream:

stream:payment.completed

Consumer:

payment-service

Policy:

attempts — 5 deliveries
backoff — pending retry every 60 seconds
jitter — none today
DLQ — `dlq:stream:payment.completed`

Safety:

booking-service получает idempotency key `payment:{invoiceId}`.
Повторная доставка не должна создать вторую бронь.
После перехода PaymentSaga в failed оператор использует recovery endpoints, а не ручную запись в БД.

Notification send

Stream:

stream:notification.send

Consumer:

notification-service

Policy:

attempts — 5 deliveries для неожиданных ошибок
backoff — pending retry every 60 seconds
jitter — none today
DLQ — `dlq:stream:notification.send`

Safety:

Unsafe file path не retry-ится.
Telegram API errors сейчас логируются и не пробрасываются, чтобы не блокировать очередь.
Если нужно retry-ить временные Telegram failures, TelegramApiError должен делиться на retryable и non-retryable.

Booking analytics events

Streams:

stream:booking.created
stream:booking.cancelled

Consumer:

analytics-service

Policy:

attempts — 5 deliveries
backoff — pending retry every 60 seconds
jitter — none today
DLQ — `dlq:{stream}`

Safety:

Analytics handlers должны пересчитывать состояние по booking id или быть идемпотентными по событию.

Booking reminders

Queue:

reminders

Producer:

booking-service

Consumer:

worker-service

Policy:

attempts — 3
backoff — exponential with 5000 ms base delay
jitter — BullMQ default behavior
DLQ — нет RedisBus DLQ, failed jobs retain last 100 failures

Safety:

jobId = `reminder:{bookingId}`
Повторная постановка job для той же брони не создаёт дубль.
При отмене брони booking-service удаляет pending reminder job.

Operator retry

PaymentSaga recovery не является автоматическим retry.
Это ручное действие оператора.

Endpoints:

GET /payment-sagas?status=recovery
POST /payment-sagas/{invoiceId}/retry-booking
POST /payment-sagas/{invoiceId}/compensate
POST /payment-sagas/{invoiceId}/mark-compensated

Правила:

retry-booking разрешён только для `failed` или `awaiting_booking`
compensate разрешён только для `failed`
mark-compensated разрешён только для `compensating`

Расширение

Для каждого нового flow нужно указать:

1. owner service
2. attempts
3. backoff
4. jitter
5. DLQ или recovery queue
6. idempotency key
7. operator runbook

Связанные документы

docs/architecture/QUEUES_AND_EVENTS.md
docs/architecture/DLQ_REPLAY.md
docs/architecture/PAYMENTS_AND_HOLDS.md
docs/operations/failure-scenarios.md
