# @metrix/audit-log

Shared audit-log boundary for bot microservices.

## Responsibility

This package owns cross-service audit-log behavior:

- writing persistent audit events to PostgreSQL;
- serializing audit payloads into JSON-safe values;
- listing audit events with pagination and safe filters;
- deleting expired audit events by retention policy.

Services should not duplicate audit-log query, cursor, payload serialization, or retention logic locally. They should pass their Prisma client or transaction client into this package and decide whether a write failure is blocking for their own flow.

## Public API

```ts
import {
  listAuditLogs,
  startAuditRetentionCleanup,
  writeAuditLog,
  type AuditLogInput,
} from '@metrix/audit-log'
```

### `writeAuditLog(prisma, input)`

Writes one persistent audit event. Works with both `PrismaClient` and Prisma transaction clients as long as they expose `auditLog.create`.

### `listAuditLogs(prisma, query)`

Reads audit events for admin surfaces. Supported query parameters:

- `limit`: page size, capped at 100;
- `cursor`: opaque cursor returned from the previous page;
- `action`, `entityId`, `entityType`, `requestId`, `service`: exact-match filters;
- `from`, `to`: timestamp range filters.

The result is JSON-ready: `bigint` and `Date` fields are converted to strings.

### `startAuditRetentionCleanup(options)`

Starts a background retention timer and returns a stop function for graceful shutdown.

The package logs retention cleanup using the logger passed by the service. This keeps logging format service-owned while keeping retention rules package-owned.

## Microservice Boundary

`@metrix/audit-log` is infrastructure-level shared code. It does not know booking, payment, admin, or Telegram domain rules. Domain services choose event names, entity ids, payload fields, and failure semantics.
