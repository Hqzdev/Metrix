# Metrix — Claude Context

Coworking space booking system. Primary UI is a Telegram bot with Telegram Payments; Next.js web app is a landing/marketing page only.

## Monorepo Structure

```
apps/bot/          — microservices (Node.js, TypeScript)
apps/web/          — Next.js landing page
packages/          — shared packages
  contracts/       — shared types & stream names (single source of truth)
  redis-bus/       — Redis Streams pub/sub wrapper
  rbac/            — role-based access control
  shared/          — shared utilities
  ui/              — shared UI components (web)
```

## Bot Services

| Service              | Port  | Responsibility                                          |
|----------------------|-------|---------------------------------------------------------|
| bot-gateway          | 3000  | Telegram webhook handler, session state machine         |
| booking-service      | 3001  | CRUD for bookings, slot locking, reminder/completion scheduling |
| analytics-service    | 3002  | Booking stats, revenue reports                          |
| payment-service      | 3003  | Telegram Payments invoice creation                      |
| calendar-service     | 3004  | Google/Microsoft calendar sync                          |
| notification-service | 3005  | Consumes NOTIFICATION_SEND, sends Telegram messages     |
| admin-service        | 3006  | Admin HTTP API (resources, locations, reports)          |
| worker-service       | —     | BullMQ workers (reminders, completions, calendar refresh, reports) |
| dashboard            | 3007  | Admin web UI (Next.js)                                  |

## Inter-Service Communication

**Redis Streams** (`@metrix/redis-bus`) are the event bus. Stream names are defined in `packages/contracts/src/index.ts` — always use `STREAMS.*` constants, never string literals.

```
stream:booking.created    — BookingCreatedEvent
stream:booking.cancelled  — BookingCancelledEvent
stream:booking.completed  — BookingCompletedEvent
stream:payment.completed  — PaymentCompletedEvent
stream:notification.send  — NotificationSendEvent
stream:report.ready       — ReportReadyEvent
```

**Service-to-service HTTP**: HMAC-signed headers (`verifyServiceRequest`). Replay protection via Redis. All inter-service calls must include auth headers.

## Booking Lifecycle (FSM)

```
active ──→ cancelled   (terminal)
active ──→ completed   (terminal, set by worker-service at endsAt time)
active ──→ rescheduled ──→ cancelled (terminal)
```

Source of truth: `apps/bot/services/booking-service/src/booking-fsm.ts`

**Auto-completion flow:**
1. Booking created → `BookingCompletionScheduler.scheduleCompletion(bookingId, endsAtIso)` adds BullMQ delayed job
2. Worker fires at `endsAtIso`, checks booking is still `active`, updates to `completed`, publishes `BOOKING_COMPLETED`
3. On cancel/reschedule: `cancelCompletion(bookingId)` removes the delayed job

**Reminder flow:**
1. Booking created → `ReminderScheduler.scheduleReminder(...)` adds BullMQ delayed job at `startsAt - 15min`
2. Worker fires, checks booking is still `active` (race condition guard), sends localized notification
3. On cancel/reschedule: `cancelReminder(bookingId)` removes the delayed job

BullMQ queue names are defined in `apps/bot/services/worker-service/src/queues.ts` (worker-service is authoritative). Both booking-service and worker-service must use identical queue names.

## Redis Session Store — CRITICAL

`UserSessionStore` in `bot-gateway/src/user-session-store.ts` uses a Lua script that **fully replaces** the session blob on every `setState` call. It is NOT a merge/patch — the entire JSON object is overwritten.

**Consequence**: never store booking-flow-persistent data inside the session blob. The reschedule intent (`rescheduleFromId`) is stored in a **separate Redis key** (`telegram:reschedule-from:{userId}`) with dedicated `setRescheduleFromId` / `getRescheduleFromId` / `clearRescheduleFromId` methods. This key survives the multiple `setState` calls that happen during the booking flow.

## Analytics — Revenue Counting

`active` + `completed` bookings count as paid/revenue. `cancelled` and `rescheduled` do not. This is implemented in `analytics-service/src/analytics-calculations.ts` — `paidBookings` = active + completed.

## Reschedule UX Flow

1. User taps "🔄 Reschedule" button on a booking
2. `setRescheduleFromId(userId, bookingId)` saved to separate Redis key
3. Session reset to `SELECT_LOCATION`, normal booking flow begins
4. On `successful_payment`: read `getRescheduleFromId` BEFORE clearing session, call `rescheduleBooking(oldBookingId)` (PATCH status → rescheduled), then `clearRescheduleFromId`
5. booking-service on rescheduled status: cancels both reminder and completion delayed jobs for the old booking

## Localization

Bot supports `en` and `ru`. Language is stored in session. All user-facing strings go through `messages.ts` in bot-gateway. Reminder and completion notifications are localized — `language` field is passed through BullMQ job data.

**Do not use Markdown formatting in notification text** sent via `NOTIFICATION_SEND` stream. The stream event type has no `parse_mode` field, so asterisks and underscores appear literally in Telegram.

## Shared Contracts Package

`packages/contracts/src/index.ts` is the **single source of truth** for:
- `Booking` type (including `status` union)
- All stream names (`STREAMS`)
- All event types (`BookingCreatedEvent`, `BookingCompletedEvent`, etc.)
- `AnalyticsSummary` type

When adding a new status, stream, or shared type: update contracts first, then update consumers.

## BullMQ Notes

- Queue name strings must match exactly between producer (booking-service) and consumer (worker-service)
- `jobId: \`reminder:${bookingId}\`` makes reminder jobs idempotent — rescheduling the same booking won't create a duplicate
- `jobId: \`completion:${bookingId}\`` same for completion jobs
- `removeOnComplete: true` — successful jobs are deleted immediately
- `removeOnFail: 100` — last 100 failed jobs kept for diagnostics
- BullMQ connections use a dedicated Redis connection (separate from the main app Redis)

## Prisma Schema Location

`apps/bot/prisma/schema.prisma` — shared across all bot services via a single Prisma client.

## TypeScript Build

Each service builds independently with `tsc`. Run from the service directory. The monorepo does not have a root-level build script.

To verify types without building: `npx tsc --noEmit` from within a service directory.
