Architecture Diagrams

Этот документ хранит Mermaid-схемы для быстрого понимания системы.
Детали по каждому блоку описаны в отдельных документах architecture.

Назначение

Диаграммы нужны, чтобы показать систему не как набор файлов, а как production-like runtime:

публичные точки входа
внутренние сервисы
потоки запросов
auth и replay protection
Redis
PostgreSQL
queues
external integrations

High-level microservices view

```mermaid
flowchart LR
  User[Telegram user] --> Telegram[Telegram API]
  Telegram --> Gateway[bot-gateway]
  Admin[Admin user] --> Gateway

  Gateway --> Booking[booking-service]
  Gateway --> Calendar[calendar-service]
  Gateway --> Payment[payment-service]
  Gateway --> Analytics[analytics-service]
  Gateway --> AdminService[admin-service]

  Booking --> Postgres[(PostgreSQL)]
  Calendar --> Postgres
  Payment --> Postgres
  Analytics --> Postgres
  AdminService --> Postgres
  Worker[worker-service] --> Postgres

  Gateway --> Redis[(Redis)]
  Booking --> Redis
  Calendar --> Redis
  Payment --> Redis
  Analytics --> Redis
  AdminService --> Redis
  Worker --> Redis

  Calendar --> Google[Google Calendar API]
  Calendar --> Microsoft[Microsoft Graph API]
  Payment --> Payments[YooKassa / Telegram Payments]
  Notification[notification-service] --> Telegram

  Redis --> Queues[BullMQ queues]
  Queues --> Worker
  Queues --> Notification
```

Booking request flow

```mermaid
sequenceDiagram
  participant U as Telegram user
  participant T as Telegram API
  participant G as bot-gateway
  participant R as Redis
  participant B as booking-service
  participant DB as PostgreSQL
  participant P as payment-service
  participant Q as BullMQ

  U->>T: booking action
  T->>G: update
  G->>R: check update idempotency and rate limit
  G->>B: signed request with X-User-Id
  B->>R: acquire slot lock
  B->>DB: validate resource and slot availability
  B->>DB: create booking draft or hold
  B->>P: signed payment hold request
  P->>DB: persist payment hold
  P->>Q: schedule hold expiration
  B-->>G: booking step response
  G-->>T: Telegram message
  T-->>U: response
```

Service-to-service auth flow

```mermaid
sequenceDiagram
  participant Caller as caller service
  participant Target as target service
  participant Redis as Redis

  Caller->>Caller: build body hash
  Caller->>Caller: sign method, path, timestamp, request id, body hash
  Caller->>Target: HTTP request with signed headers
  Target->>Target: validate required headers
  Target->>Target: validate timestamp window
  Target->>Target: resolve trusted caller secret
  Target->>Target: reproduce HMAC signature
  Target->>Redis: SET replay:{requestId} NX EX 60
  Redis-->>Target: created or already exists
  Target-->>Caller: success, 401 or 409
```

Redis responsibilities

```mermaid
flowchart TB
  Redis[(Redis)]

  Redis --> RateLimit[rate limit counters]
  Redis --> Replay[replay request ids]
  Redis --> UpdateStore[Telegram update idempotency]
  Redis --> SlotLocks[slot locks]
  Redis --> Queues[BullMQ queues]
  Redis --> Cache[short-lived cache]

  RateLimit --> Gateway[bot-gateway]
  Replay --> Services[internal services]
  UpdateStore --> Gateway
  SlotLocks --> Booking[booking-service]
  Queues --> Worker[worker-service]
  Queues --> Notification[notification-service]
```

Data ownership

```mermaid
flowchart LR
  Booking[booking-service] --> BookingTables[Booking, Resource, Slot]
  Calendar[calendar-service] --> CalendarTables[CalendarConnection, CalendarEvent]
  Payment[payment-service] --> PaymentTables[Payment, PaymentHold]
  Analytics[analytics-service] --> AnalyticsReads[Read models and aggregates]
  Admin[admin-service] --> Audit[AuditLog]

  BookingTables --> DB[(PostgreSQL)]
  CalendarTables --> DB
  PaymentTables --> DB
  AnalyticsReads --> DB
  Audit --> DB
```

Queue flow

```mermaid
flowchart LR
  Booking[booking-service] --> ReminderQueue[reminder queue]
  Payment[payment-service] --> PaymentQueue[payment queue]
  Payment --> HoldQueue[hold expiration queue]
  Calendar[calendar-service] --> CalendarQueue[calendar sync queue]

  ReminderQueue --> Worker[worker-service]
  PaymentQueue --> Worker
  HoldQueue --> Worker
  CalendarQueue --> Worker

  Worker --> Notification[notification-service]
  Worker --> Booking
  Worker --> Calendar
  Worker --> Payment
```

Связанные документы

SYSTEM_OVERVIEW.md
MODULES.md
API_CONTRACTS.md
DATABASE_SCHEMA.md
QUEUES_AND_EVENTS.md
SECURITY.md
DEPLOYMENT.md
