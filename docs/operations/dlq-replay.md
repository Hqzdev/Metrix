DLQ Replay Runbook

Этот документ объясняет, как replay-ить DLQ сообщение.

Когда нужен replay

Когда событие не обработалось автоматически и попало в DLQ.

Перед replay

1. Понять причину ошибки.
2. Убедиться, что причина исправлена.
3. Проверить, что replay безопасен.
4. Для payment events проверить PaymentSaga.

Команды через admin-service

- GET /dlq/streams
- GET /dlq?stream={stream}
- POST /dlq/replay

После replay

Проверить:

- target stream получил сообщение;
- consumer обработал его;
- audit содержит dlq.replayed;
- ошибка не повторяется.
