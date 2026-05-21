Redis Outage Runbook

Этот документ объясняет, что делать, если Redis недоступен.

Почему Redis важен

Redis используется для:

- rate limit;
- replay protection;
- Telegram state;
- queues;
- DLQ;
- locks;
- BullMQ jobs.

Симптомы

- /ready возвращает 503;
- в logs есть Redis connection errors;
- stream consumers не двигаются;
- Telegram flow ломается или деградирует.

Что делать

1. Не запускать DLQ replay.
2. Не отключать safety checks.
3. Проверить Redis container/service.
4. Проверить password и network.
5. Восстановить Redis.
6. Проверить /ready.
7. Проверить stream lag и DLQ.

После восстановления

Убедиться, что сервисы снова healthy.
Проверить, нет ли накопленных failed events.
