# @metrix/contracts

Shared TypeScript contracts for bot microservices.

## Responsibility

This package owns stable shapes that cross service boundaries:

- HTTP request and response payload types;
- JSON-safe domain DTOs returned by services;
- Redis stream names;
- Redis stream event payloads.

Contracts should stay dependency-light and domain-neutral. They describe data shapes; they do not validate input, access databases, call other services, or contain service-specific business logic.

## Structure

- `booking.ts`: booking, location, resource, slot DTOs and booking request payloads.
- `calendar.ts`: calendar connection DTOs and OAuth request payloads.
- `payment.ts`: invoice DTOs and payment request payloads.
- `reports.ts`: report DTOs.
- `analytics.ts`: analytics summary DTOs.
- `streams.ts`: Redis stream names.
- `events.ts`: Redis stream event payloads.
- `index.ts`: compatibility barrel for existing `@metrix/contracts` imports.

## Public API

Existing imports should continue to work:

```ts
import { STREAMS, type Booking, type CreateInvoiceInput } from '@metrix/contracts'
```

New code can still import from the package root. Keep deep imports out of services unless a package export map is added for them.

## Microservice Boundary

Use this package when two or more services must agree on a shape. Keep private service internals in the service itself. If a type is used only inside one service, it should not live here.

When changing a contract:

- keep changes backward-compatible when possible;
- update producers and consumers together;
- avoid renaming Redis stream names without an explicit Redis consumer-group migration plan.
