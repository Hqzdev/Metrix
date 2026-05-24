# @metrix/auth

Shared authentication and request-security boundary for bot microservices.

## Responsibility

This package owns reusable auth primitives:

- service-to-service request signing and verification;
- W3C `traceparent` creation and validation;
- signed Telegram user id propagation from `bot-gateway` to downstream services;
- signed OAuth `state` values for redirect flows;
- bounded HTTP body reading and JSON parsing;
- lightweight structured audit events written to stdout.

Domain services should not duplicate HMAC signing, request body limits, trace header validation, or OAuth state verification locally.

## Public API

```ts
import {
  audit,
  buildAuthHeaders,
  extractUserId,
  readJsonBody,
  signOAuthState,
  signUserId,
  verifyOAuthState,
  verifyServiceRequest,
  type TrustedCaller,
} from '@metrix/auth'
```

### Service-to-Service Auth

Use `buildAuthHeaders` when one service calls another. The signature covers:

- HTTP method;
- URL path with query string;
- timestamp;
- request id;
- SHA-256 hash of the raw body.

Use `verifyServiceRequest` only after reading the raw request body. Services are still responsible for replay protection, usually by storing `requestId` in Redis with `NX`.

### User Identity Propagation

`bot-gateway` signs Telegram user ids with `signUserId`. Downstream services read them with `extractUserId`, which validates the signature before returning the user id.

### OAuth State

Calendar and future OAuth integrations can use `signOAuthState` and `verifyOAuthState` to prevent redirect callback tampering.

### Request Body Helpers

`readBody` and `readJsonBody` enforce a shared 64 KB request body limit for service JSON calls.

### Stdout Audit

`audit(entry)` writes one JSON line to stdout. This is for lightweight structured audit events routed by log collectors. Persistent audit events belong in `@metrix/audit-log`.

## Microservice Boundary

`@metrix/auth` is infrastructure-level shared code. It does not decide which callers are trusted, which routes require auth, or how replay attempts are handled. Each service owns those policy decisions and passes config into this package.
