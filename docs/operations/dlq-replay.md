DLQ Replay Runbook

Этот runbook описывает безопасный replay сообщений из DLQ.

When replay is allowed

Replay разрешён только после диагностики причины ошибки.
Replay запрещён, если payload устарел или повторная обработка может создать дубль оплаты, брони или уведомления.

Inputs

dlqStream
messageId
targetStream
incident reason
operator identity

Steps

1. Открыть `GET /dlq/streams`.
2. Выбрать stream.
3. Открыть `GET /dlq?stream={stream}&limit=10`.
4. Проверить originalStream, originalId и deliveryCount.
5. Найти error log по originalId.
6. Проверить payload.
7. Проверить idempotency key или бизнес-состояние.
8. Исправить root cause.
9. Вызвать `POST /dlq/replay`.
10. Проверить consumer lag.
11. Проверить audit action `dlq.replayed`.

Replay body

{
  "dlqStream": "dlq:stream:notification.send",
  "messageId": "1710000000000-0",
  "targetStream": "stream:notification.send"
}

Safety checks

Для payment.completed:

проверить invoiceId
проверить PaymentSaga
проверить Booking по `payment:{invoiceId}`

Для booking events:

проверить booking id
проверить idempotency key
проверить analytics/report side effects

Для notification.send:

проверить, что уведомление ещё актуально
проверить, что повторная доставка допустима

Rollback

Replay нельзя откатить автоматически.
Если replay создал неверное бизнес-состояние, открыть incident и использовать доменный recovery flow.

Связанные документы

docs/architecture/DLQ_REPLAY.md
docs/architecture/RETRY_STRATEGY.md
docs/operations/failure-scenarios.md
