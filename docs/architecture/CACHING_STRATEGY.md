Caching Strategy

Этот документ описывает, что Metrix хранит в Redis, какие TTL используются и что запрещено кешировать.

Назначение

Redis в Metrix используется как short-lived operational state, а не как второй source of truth.
PostgreSQL остаётся источником истины для booking, payment, calendar, audit и admin data.

Что хранится в Redis

| Data | Key / storage | Owner | TTL | Invalidation | Purpose |
| --- | --- | --- | --- | --- | --- |
| Telegram rate limit counters | `ratelimit:{userId}:{window}` | bot-gateway | 10 seconds | automatic expire | fixed-window limit per Telegram user |
| Service replay protection | `replay:{requestId}` | internal services | 60 seconds | automatic expire | reject duplicate signed service requests |
| Telegram processed updates | `telegram:updates:processed:{updateId}` | bot-gateway | 7 days | automatic expire | skip duplicate Telegram updates |
| Telegram polling offset | `telegram:updates:offset` | bot-gateway | none | monotonic Lua update | continue polling after restart |
| Telegram FSM session | user session key | bot-gateway | 1 hour | overwrite on state transition or expire | resume booking flow |
| Slot lock | slot lock key | booking-service | short lock TTL | unlock after transaction or expire | prevent concurrent booking writes |
| Redis Streams | `stream:*` | service owner | retention by Redis policy | ACK after handler success | async service events |
| DLQ streams | `dlq:stream:*` | admin-service / operators | none today | manual replay policy | preserve failed events |
| BullMQ jobs | BullMQ keys | booking-service / worker-service | queue policy | complete/fail cleanup | reminders and worker jobs |

TTL rules

Short TTL:

rate limit counters
replay request ids
slot locks
temporary FSM/session state

No TTL:

polling offset
Redis Streams
DLQ streams
BullMQ queue state

No TTL data must have an owner and a cleanup or retention policy.

Invalidation rules

Rate limit counters expire automatically.
Replay protection keys expire automatically.
Processed Telegram update keys expire after duplicate delivery window.
FSM session is overwritten on every state transition and expires after inactivity.
Slot lock is released after successful transaction and also protected by TTL.
Redis Stream messages are ACKed only after successful handler execution.
DLQ messages are removed or marked only by operator policy after successful replay.
BullMQ reminder jobs are removed on complete and retained on fail according to queue options.

What must not be cached

PaymentSaga final state
SlotHold final state
PendingInvoice status
Booking final state
AuditLog records
Google refresh tokens
OAuth state secrets
RBAC policy decisions without actor context
Admin write results

Reason:

эти данные должны переживать Redis loss и быть восстановимыми из PostgreSQL или provider state.

Cache miss policy

Cache miss не должен менять бизнес-состояние.
Если Redis недоступен для safety-critical state, сервис должен отказать запрос или перейти в safe failure mode.
Нельзя silently bypass rate limit, replay protection или slot lock в production.

Allowed future cache

Короткий read-through cache допустим для:

location list
resource list
availability summary
analytics aggregates

Условия:

TTL не больше нескольких минут
invalidation при admin update или booking write
cache miss читает source of truth
stale cache не должен подтверждать оплату или бронирование

Связанные документы

docs/architecture/SECURITY.md
docs/architecture/QUEUES_AND_EVENTS.md
docs/architecture/PAYMENTS_AND_HOLDS.md
docs/operations/failure-scenarios.md
