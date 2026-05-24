# @metrix/redis-bus

Shared Redis infrastructure for bot microservices.

## Responsibility

This package owns reusable Redis primitives:

- Redis Stream publishing;
- Redis Stream consumer groups;
- pending message retry with `XCLAIM`;
- dead-letter queue handoff after repeated failures;
- consumer lag reads for metrics;
- request replay protection via `SET NX EX`;
- distributed slot locking for booking concurrency control.

Services own event payload contracts, handler idempotency, business retries, and what to do with DLQ entries operationally.

## Structure

- `redis-bus.ts`: `RedisBus` class for stream publish/consume/retry/lag/replay.
- `slot-locker.ts`: slot-level Redis lock for booking transactions.
- `constants.ts`: stream retry and polling constants.
- `types.ts`: public bus option and raw Redis response types.
- `logger.ts`: default structured stderr logger and error serializer.
- `utils.ts`: small Redis stream helpers.
- `index.ts`: package root exports.

## Public API

```ts
import { RedisBus, SlotLocker } from '@metrix/redis-bus'
```

### `RedisBus`

Create one bus per service process:

```ts
const bus = new RedisBus(config.redisUrl, logger, { password: process.env.REDIS_PASSWORD })
await bus.connect()
```

Use `publish(stream, event)` for Redis Stream events. Use `consume(stream, group, consumer, handler, options)` for consumer groups.

Handlers must be idempotent. If a handler throws, the message is intentionally not acknowledged and remains in the pending list.

### Pending Retry and DLQ

`consume` can start a pending retry interval with `retryPendingIntervalMs`. Messages whose delivery count exceeds the package limit are moved to `dlq:${stream}` and acknowledged in the original stream.

### Replay Protection

`checkReplay(requestId, ttlSeconds)` stores a short-lived Redis key with `NX`. It returns `true` only the first time a request id is seen.

### Slot Locking

`SlotLocker` provides a Redis `SET NX PX` lock around `(resourceId, slotId)` to avoid duplicate booking races before the database unique constraint is reached.

## Microservice Boundary

`@metrix/redis-bus` is infrastructure-level shared code. It should not import service contracts directly or know domain event names. Services pass stream names and payloads in from `@metrix/contracts` and implement domain handlers locally.
