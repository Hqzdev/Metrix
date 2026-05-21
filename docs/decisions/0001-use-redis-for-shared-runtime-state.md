ADR 0001: Use Redis For Shared Runtime State

Status

Accepted.

Context

Bot runtime должен хранить быстрое временное состояние:

- Telegram update idempotency;
- FSM state;
- rate limit;
- locks;
- queues;
- retry;
- DLQ.

PostgreSQL для этого слишком тяжелый, а память одного процесса не подходит для нескольких сервисов.

Decision

Использовать Redis.

Consequences

Плюсы:

- быстро;
- подходит для TTL;
- подходит для locks;
- подходит для Streams;
- работает между сервисами.

Минусы:

- Redis становится важной зависимостью;
- при Redis down safety-critical flows должны fail safely;
- важные данные нельзя хранить только в Redis.
