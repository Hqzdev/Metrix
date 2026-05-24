# @metrix/rbac

Shared role-based access control primitives for bot microservices.

## Responsibility

This package owns reusable authorization primitives:

- role and permission types;
- role-to-permission matrix;
- actor factories for Telegram users and internal services;
- policy evaluation helpers with denial reasons.

Services still own route-level policy decisions, admin id configuration, and audit/log behavior for denied actions.

## Structure

- `types.ts`: roles, permissions, actors, and policy decisions.
- `permissions.ts`: `ROLE_PERMISSIONS` matrix.
- `actors.ts`: actor factory helpers.
- `evaluator.ts`: `can`, `evaluatePolicy`, and `listPermissions`.
- `index.ts`: package root exports.

## Public API

```ts
import {
  createTelegramActor,
  evaluatePolicy,
  type Permission,
} from '@metrix/rbac'
```

### Actors

`createTelegramActor(userId, adminTelegramIds)` maps Telegram users to roles. Admin Telegram ids come from service config, not from this package.

`createServiceActor(serviceName)` creates an internal service actor with the `service` role.

### Policy Evaluation

Use `evaluatePolicy(actor, permission)` when a caller needs an allow/deny result with a reason suitable for audit logs. Use `can(actor, permission)` when a boolean is enough.

## Microservice Boundary

`@metrix/rbac` defines shared authorization primitives. It should not read environment variables, talk to databases, or know HTTP routes. Each service decides which permission protects each action and records denied decisions through its own logging/audit boundary.
