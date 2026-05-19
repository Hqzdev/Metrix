DLQ Replay

Этот документ описывает ручной replay сообщений из dead letter queue.

Назначение

DLQ нужна, чтобы событие не терялось после серии неуспешных retry.
Replay нужен, чтобы оператор мог вернуть событие в исходный stream после исправления причины ошибки.

Когда replay разрешён

Replay разрешён только после диагностики причины падения.
Нельзя автоматически возвращать все DLQ сообщения в исходный stream без проверки.

Перед replay нужно проверить:

ошибка handler исправлена
downstream dependency доступна
payload не содержит устаревшее состояние
handler идемпотентный
повторная обработка не создаст дубль платежа, брони или уведомления

Формат DLQ

DLQ stream:

dlq:{originalStream}

Поля:

data — исходный JSON payload
originalStream — исходный stream
originalId — исходный Redis message id
deliveryCount — число попыток доставки

Ручная процедура replay

1. прочитать сообщение из dlq stream
2. проверить originalStream
3. проверить data
4. найти incident или error log по originalId
5. исправить причину ошибки
6. добавить data обратно в originalStream
7. удалить или пометить DLQ сообщение как replayed
8. проверить consumer lag и бизнес-состояние

Admin endpoints

admin-service предоставляет internal endpoints:

GET /dlq?stream=stream:notification.send&limit=10
GET /dlq/streams
POST /dlq/replay

Replay body:

{
  "dlqStream": "dlq:stream:notification.send",
  "messageId": "1710000000000-0",
  "targetStream": "stream:notification.send"
}

targetStream опционален.
Если targetStream не передан, используется originalStream из DLQ сообщения.

Успешный replay пишет audit action:

dlq.replayed

Пример Redis CLI

Посмотреть DLQ:

XREVRANGE dlq:stream:notification.send + - COUNT 10

Вернуть payload в исходный stream:

XADD stream:notification.send * data "{...}"

После успешной проверки можно ack/delete DLQ запись согласно выбранной operator policy.

Правила безопасности

Не replay-ить payment.completed без проверки invoiceId и PaymentSaga.
Не replay-ить booking.created без проверки idempotency key.
Не replay-ить notification.send если уведомление уже доставлено и повтор недопустим.

Будущая автоматизация

Admin tooling для DLQ должен:

1. показывать originalStream, originalId и deliveryCount
2. показывать payload в redacted виде
3. писать audit action dlq.replayed
4. добавлять replayedBy и replayedAt

Что уже есть:

GET /dlq возвращает id, data, originalStream, originalId и deliveryCount
GET /dlq/streams возвращает список dlq:* streams для operator screen
POST /dlq/replay публикует payload обратно в stream
persistent audit action dlq.replayed

Что ещё остаётся для UI:

reason для replay
redaction payload перед показом оператору
отдельный экран со статусом replay и ссылкой на audit log
