Telegram Bot Diagrams

Эта папка содержит Mermaid-диаграммы Telegram bot runtime.

Главное

Диаграммы обновлены под текущую архитектуру:

- микросервисы в apps/bot;
- PostgreSQL через PgBouncer;
- Redis для rate limit, replay, locks, FSM, Streams и DLQ;
- HMAC service-to-service protection;
- signed Telegram user id;
- audit log;
- PaymentSaga и SlotHold;
- health/readiness/metrics endpoints;
- admin DLQ replay и payment recovery.

Список диаграмм

- 01-bot-overview.mmd — общий путь пользователя через Telegram.
- 02-booking-flow.mmd — создание брони с защитами.
- 03-cancel-reschedule-flow.mmd — отмена и recovery-friendly flow.
- 04-reminder-flow.mmd — reminders, notification retry и DLQ.
- 05-bot-architecture.mmd — runtime-архитектура bot services.
- 06-microservices-architecture.mmd — Docker/internal network, PgBouncer, PostgreSQL и Redis.
- 07-db-schema.mmd — актуальная bot runtime database schema.
- 08-booking-flow-ms.mmd — paid booking flow с SlotHold, PaymentSaga и idempotency.
- 09-calendar-flow.mmd — OAuth flow, signed state и encrypted tokens.
- 10-cancel-flow-ms.mmd — отмена брони с authorization.
- 11-redis-streams.mmd — Redis state, streams, retry и DLQ.
- 12-service-http-api.mmd — internal HTTP API map и security на вызовах.
- 13-security-boundaries.mmd — отдельная security boundary diagram.

Как смотреть

Открыть `.mmd` файл в редакторе с Mermaid preview.

Важно

Диаграммы помогают понять систему, но источник правды — код, Prisma schema и OpenAPI.
Если меняешь flow, обнови диаграмму рядом с кодом.
