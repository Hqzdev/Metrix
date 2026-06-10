Retry Strategy

Этот документ объясняет retry.

Зачем нужен retry

Иногда ошибка временная:

- сеть моргнула;
- Redis был недоступен;
- сервис перезапускался;
- Telegram/API ответил не сразу.

Retry дает системе шанс повторить действие.

Где есть retry

- Redis Streams pending retry.
- Payment completed consumer.
- Notification delivery.
- Booking events consumers.
- BullMQ reminders.

Общее правило

Retry безопасен только если действие idempotent.

Простыми словами:

повторная попытка не должна создать второй платеж, вторую бронь или второй опасный эффект.

Circuit breaker

Retry не должен бесконечно давить на уже упавший сервис. Для межсервисных HTTP
вызовов нужен circuit breaker:

- `closed` — запросы идут как обычно;
- `open` — после серии ошибок новые запросы сразу получают fallback;
- `half-open` — после cooldown один пробный запрос проверяет, восстановился ли сервис.

Первый кандидат — bot-gateway -> payment-service и bot-gateway -> booking-service.
Если payment-service недоступен, gateway должен быстро вернуть понятный fallback
в Telegram, а не держать пользователя до сетевого timeout.

Целевые настройки для первого PR с кодом:

- библиотека: `opossum`;
- timeout: 1500 ms;
- error threshold: 50%;
- rolling window: 10 секунд;
- reset timeout: 30 секунд;
- fallback: короткое сообщение пользователю и structured log `circuit.open`.

Метрики:

- `metrix_circuit_state{service,target}`;
- `metrix_circuit_open_total{service,target}`;
- `metrix_circuit_fallback_total{service,target}`.

DLQ threshold

Если сообщение слишком много раз не обработалось, оно идет в DLQ.

Что делает оператор

1. Смотрит DLQ.
2. Понимает причину.
3. Чинит источник ошибки.
4. Делает replay.
5. Проверяет audit log.

Что улучшить

Добавить jitter там, где много сервисов могут повторять запрос одновременно.
