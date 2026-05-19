Failure Scenarios

Этот документ описывает базовые production failure сценарии для Metrix.
Он нужен как runbook для оператора: что ломается, как это увидеть, что сделать первым и какой остаточный риск остаётся после mitigation.

Назначение

Failure scenario должен отвечать на четыре вопроса:

1. какой пользовательский или бизнес-impact возникает
2. как быстро понять, что сценарий начался
3. какие действия безопасны для восстановления
4. какие риски нельзя убрать автоматически

Общие правила

Не запускать replay из DLQ до понимания причины падения.
Не повторять payment или booking вручную без проверки idempotency key.
Не удалять SlotHold, PendingInvoice, PaymentSaga или audit records во время incident.
Не считать 200 OK от Telegram, Redis или PostgreSQL доказательством бизнес-успеха.
Всегда связывать действия оператора с incident id или reason в audit log, когда endpoint это поддерживает.

Сводная таблица

| Сценарий | Impact | Detection | Mitigation | Residual risk |
| --- | --- | --- | --- | --- |
| Redis down | Очереди, idempotency, replay protection и stream consumers недоступны или деградируют. | `/ready` возвращает 503, растут 5xx, нет прогресса consumer groups, Redis connection errors в logs. | Остановить опасные ручные replay, восстановить Redis, проверить stream lag и DLQ, затем постепенно вернуть consumers. | Часть входящих запросов могла быть отклонена; Telegram или клиент может повторить доставку позже. |
| PostgreSQL down | Нельзя надёжно читать и менять booking/payment/audit состояние. | `/ready` возвращает 503, Prisma/database errors, растут 5xx на write endpoints. | Перевести систему в режим отказа для write flows, восстановить DB, проверить migrations/connection pool, сверить PaymentSaga и SlotHold. | Внешний провайдер мог принять событие, пока локальная запись не была завершена. |
| Telegram down | Пользователи не получают invoices, confirmations и service notifications. | Ошибки Telegram API, рост DLQ для `stream:notification.send`, жалобы пользователей на отсутствие сообщений. | Не дублировать сообщения вручную, дождаться восстановления Telegram, replay notification DLQ после проверки payload и delivery state. | Telegram может доставить задержанные сообщения позже; часть уведомлений может стать неактуальной. |
| Duplicate payment callback | Один и тот же successful payment или payment event приходит повторно. | Повторный invoiceId/providerPaymentChargeId в logs, repeated `PAYMENT_COMPLETED`, idempotency hit в booking-service. | Проверить PaymentSaga, Booking по `payment:{invoiceId}`, не создавать ручную бронь, использовать retry-booking только для failed/awaiting_booking saga. | Если внешний refund нужен, он остаётся ручной операцией вне автоматического retry. |

Redis down

Что ломается

Redis используется для Streams, consumer groups, retry/DLQ, replay protection и части idempotency-защит.
При полном отказе Redis система должна предпочесть отказ запросов вместо небезопасного выполнения без защиты от дублей.

Первичная диагностика

1. Проверить `/ready` у bot/admin/payment/booking/notification сервисов.
2. Найти Redis connection errors в structured logs.
3. Проверить, растёт ли HTTP 5xx rate.
4. После восстановления Redis проверить `metrix_redis_stream_lag`.
5. Посмотреть `GET /dlq/streams`, если admin-service доступен.

Safe response

1. Не запускать `POST /dlq/replay`, пока Redis нестабилен.
2. Не подтверждать вручную payment/booking flows без проверки состояния в PostgreSQL.
3. Восстановить Redis endpoint/password/network.
4. Дождаться зелёного `/ready`.
5. Проверить pending/lag по stream consumers.
6. Разбирать DLQ по одному stream и одному failure class.

Verification

После восстановления нужно подтвердить:

1. `/ready` возвращает 200 для сервисов, зависящих от Redis
2. `metrix_redis_stream_lag` снижается
3. новые `dlq:*` сообщения не появляются сериями
4. replay выполняется только для payload, прошедших ручную проверку

Residual risk

Telegram может повторить updates после восстановления.
Клиент мог повторить HTTP action.
Часть notification events могла попасть в DLQ и требовать ручного replay.

PostgreSQL down

Что ломается

PostgreSQL является source of truth для booking, payment saga, holds, invoices и audit.
Если база недоступна, write flows нельзя считать завершёнными.

Первичная диагностика

1. Проверить `/ready`.
2. Проверить logs на Prisma/database connection errors.
3. Проверить, нет ли исчерпания connection pool.
4. Проверить provider status или инфраструктурный healthcheck.
5. После восстановления проверить последние PaymentSaga со status `awaiting_booking`, `failed`, `compensating`.

Safe response

1. Не выполнять manual SQL updates без отдельного incident decision.
2. Не чистить SlotHold и PendingInvoice вручную.
3. Восстановить доступность DB.
4. Проверить, что migrations не находятся в частично применённом состоянии.
5. Проверить payment recovery queue через admin endpoints.
6. Для saga в `awaiting_booking` или `failed` использовать `retry-booking`, если Booking ещё не создан.
7. Для saga, где booking невозможен и нужен возврат, использовать compensation flow.

Verification

После восстановления нужно подтвердить:

1. новые bookings создаются атомарно
2. audit writes проходят
3. active SlotHold не зависли после истечения `expiresAt`
4. PaymentSaga не остались в recovery status без operator decision

Residual risk

Платёжный или Telegram callback мог быть принят внешней системой во время локального отказа.
В таком случае локальная saga может требовать ручной сверки с invoice/provider identifiers.

Telegram down

Что ломается

Telegram API используется для invoices, pre-checkout responses и пользовательских уведомлений.
Даже если внутренний booking/payment state корректен, пользователь может не получить сообщение вовремя.

Первичная диагностика

1. Проверить ошибки Telegram API в notification-service и bot-gateway logs.
2. Проверить DLQ для `stream:notification.send`.
3. Проверить рост retry и stream lag.
4. Проверить, нет ли duplicate Telegram updates после восстановления.

Safe response

1. Не отправлять вручную массовые дубликаты уведомлений.
2. Если invoice не отправлен, проверить PendingInvoice и SlotHold перед повторной отправкой.
3. Если confirmation не отправлен, проверить Booking и PaymentSaga перед replay notification.
4. После восстановления Telegram replay-ить DLQ постепенно.
5. Для устаревших payload не делать replay; вместо этого отправить актуальное состояние отдельной operator action, когда такая action появится.

Verification

После восстановления нужно подтвердить:

1. новые Telegram API calls проходят
2. `stream:notification.send` lag снижается
3. DLQ не пополняется тем же failure reason
4. пользовательское состояние соответствует фактическим Booking/PaymentSaga records

Residual risk

Telegram может доставить старое сообщение после того, как slot/payment state уже изменился.
Пользователь может нажать на устаревшую кнопку или повторить действие; handlers должны полагаться на текущее состояние, а не на текст сообщения.

Duplicate payment callback

Что ломается

Повтор payment callback опасен тем, что может попытаться создать вторую бронь или повторно отправить confirmation.
Защита должна строиться на PaymentSaga, PendingInvoice и idempotency key `payment:{invoiceId}`.

Первичная диагностика

1. Найти invoiceId в payment-service logs.
2. Проверить PendingInvoice status.
3. Проверить PaymentSaga status.
4. Проверить Booking по idempotency key `payment:{invoiceId}`.
5. Проверить audit actions для payment transition.

Safe response

1. Если Booking уже создан, не создавать ручную бронь.
2. Если PaymentSaga `completed`, считать callback duplicate и проверить только notification state.
3. Если PaymentSaga `awaiting_booking`, дождаться consumer retry или использовать `retry-booking`.
4. Если PaymentSaga `failed`, проверить failureReason и использовать `retry-booking` только если повторное создание Booking безопасно.
5. Если нужна внешняя компенсация, использовать `compensate`, затем `mark-compensated` после подтверждения refund/manual resolution.

Verification

После обработки duplicate callback нужно подтвердить:

1. существует не больше одного Booking на payment idempotency key
2. SlotHold переведён в финальный статус
3. PendingInvoice не вернулся в `pending`
4. PaymentSaga имеет финальный или осознанный recovery status
5. audit log содержит operator action для ручного вмешательства

Residual risk

Внешний платёжный провайдер может требовать отдельную ручную сверку.
Повторная отправка confirmation может быть допустимой, но не должна менять бизнес-состояние.

Связанные документы

docs/architecture/PRODUCTION_READINESS.md
docs/architecture/ALERTING.md
docs/architecture/DLQ_REPLAY.md
docs/architecture/PAYMENTS_AND_HOLDS.md
docs/architecture/QUEUES_AND_EVENTS.md
docs/architecture/SECURITY.md
