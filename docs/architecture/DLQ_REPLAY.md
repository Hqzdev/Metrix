DLQ Replay

Этот документ объясняет, как работает replay сообщений из DLQ.

Что такое DLQ

DLQ — это очередь для сообщений, которые система не смогла обработать после нескольких попыток.

Зачем она нужна

Чтобы событие не потерялось.
Лучше положить проблемное сообщение в DLQ, чем silently забыть его.

Как называется DLQ stream

dlq:{originalStream}

Например:

dlq:stream:notification.send

Что хранится в сообщении

- data — payload;
- originalStream — исходный stream;
- originalId — исходный message id;
- deliveryCount — сколько раз пробовали доставить.

Как replay-ить

Через admin-service:

- GET /dlq/streams
- GET /dlq?stream={stream}
- POST /dlq/replay

Что обязательно

Каждый replay пишет audit action:

dlq.replayed

Правило безопасности

Не replay-ить платежные события без проверки PaymentSaga и invoiceId.
