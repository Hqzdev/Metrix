Diagrams

Этот документ объясняет, какие диаграммы есть в проекте.

Где лежат диаграммы

docs/telegram-bot-diagrams

Формат

Mermaid `.mmd`.

Что обновлено

Диаграммы теперь показывают текущую архитектуру:

- bot-gateway как публичную точку входа;
- internal services внутри Docker network;
- PostgreSQL через PgBouncer;
- Redis как state, Streams, retry и DLQ слой;
- HMAC service-to-service auth;
- replay protection;
- signed Telegram user id;
- encrypted calendar tokens;
- audit log;
- PaymentSaga и SlotHold;
- admin DLQ replay и payment recovery.

Самые важные диаграммы

- 06-microservices-architecture.mmd — общая микросервисная схема.
- 07-db-schema.mmd — схема базы bot runtime.
- 08-booking-flow-ms.mmd — платное бронирование.
- 11-redis-streams.mmd — Redis, retry и DLQ.
- 12-service-http-api.mmd — internal API map.
- 13-security-boundaries.mmd — защита и границы доверия.

Правило

Если меняется flow, security boundary или база, диаграмму нужно обновить в том же изменении.
