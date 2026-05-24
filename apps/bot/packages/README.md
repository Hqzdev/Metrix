# Bot Packages

Shared packages for `apps/bot` microservices.

These packages are infrastructure and contract boundaries used by services in `apps/bot/services`. They should stay small, dependency-light, and focused on reusable behavior. Service-specific business logic belongs in the service that owns it.

## Package Map

- `audit-log` — persistent audit-log writer, reader, JSON payload serialization, and retention cleanup.
- `auth` — service-to-service HMAC auth, signed Telegram user id headers, OAuth state signing, bounded JSON body helpers, stdout audit events.
- `contracts` — cross-service TypeScript DTOs, request payloads, Redis stream names, and event payloads.
- `health` — PostgreSQL/Redis health checks and optional `/health` HTTP helpers.
- `observability` — Prometheus metrics registry, observed HTTP wrapper, readiness responses, route normalization, graceful shutdown.
- `rbac` — roles, permissions, actor factories, policy evaluation.
- `redis-bus` — Redis Stream bus, pending retry, DLQ handoff, consumer lag, replay protection, slot locking.

## Import Rule

Services should import from package roots:

```ts
import { RedisBus } from '@metrix/redis-bus'
import { verifyServiceRequest } from '@metrix/auth'
```

Avoid deep imports such as `@metrix/auth/src/service-signature.js` unless the package export map is intentionally expanded.

## Boundary Rule

Put code here only when at least two services need the same behavior or shape.

Keep service-owned logic out of shared packages:

- HTTP route decisions;
- environment parsing;
- domain workflows;
- provider-specific orchestration;
- business validation that belongs to one service.

## Package Docs

Each package has its own README with responsibilities, public API, and microservice boundary notes.
