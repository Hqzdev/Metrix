-- ─── Migration: production hardening ──────────────────────────────────────────
-- Adds:
--   1. idempotencyKey to Booking  — защита от дублей при client retry
--   2. PaymentSaga table          — saga-паттерн для многочастных платежей
--   3. Partial unique index       — защита от double-booking на уровне БД
--   4. SlotHold table             — временная бронь слота до оплаты
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Idempotency key на бронировании
ALTER TABLE booking."Booking"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_idempotencyKey_key"
  ON booking."Booking" ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- 2. Partial unique index: один активный слот = одно бронирование.
-- Фall-back на уровне БД если Redis-лок каким-то образом не отработал.
-- Partial index не мешает cancelled/rescheduled бронированиям на то же время.
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_active_slot_unique"
  ON booking."Booking" ("resourceId", "slotId")
  WHERE status = 'active';

-- 3. PaymentSaga table
CREATE TABLE IF NOT EXISTS payment."PaymentSaga" (
  "id"             TEXT        NOT NULL,
  "invoiceId"      TEXT        NOT NULL,
  "resourceId"     TEXT        NOT NULL,
  "slotId"         TEXT        NOT NULL,
  "telegramUserId" BIGINT      NOT NULL,
  "chatId"         BIGINT      NOT NULL,
  "totalAmount"    INTEGER     NOT NULL,
  "paidAmount"     INTEGER     NOT NULL DEFAULT 0,
  "status"         TEXT        NOT NULL DEFAULT 'pending',
  "currentPart"    INTEGER     NOT NULL DEFAULT 1,
  "totalParts"     INTEGER     NOT NULL DEFAULT 1,
  "failureReason"  TEXT,
  "bookingId"      TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PaymentSaga_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSaga_invoiceId_key"
  ON payment."PaymentSaga" ("invoiceId");

-- 4. SlotHold table
CREATE TABLE IF NOT EXISTS payment."SlotHold" (
  "id"             TEXT        NOT NULL,
  "resourceId"     TEXT        NOT NULL,
  "slotId"         TEXT        NOT NULL,
  "telegramUserId" BIGINT      NOT NULL,
  "invoiceId"      TEXT,
  "status"         TEXT        NOT NULL DEFAULT 'held',
  "expiresAt"      TIMESTAMPTZ NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "SlotHold_pkey" PRIMARY KEY ("id")
);

ALTER TABLE payment."PendingInvoice"
  ADD COLUMN IF NOT EXISTS "holdId" TEXT;

ALTER TABLE payment."PendingInvoice"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "supersededByInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_invoiceId_key"
  ON payment."SlotHold" ("invoiceId")
  WHERE "invoiceId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_active_slot_unique"
  ON payment."SlotHold" ("resourceId", "slotId")
  WHERE status = 'held';

-- 5. Persistent audit log
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit."AuditLog" (
  "id"            TEXT        NOT NULL,
  "ts"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "service"       TEXT        NOT NULL,
  "action"        TEXT        NOT NULL,
  "actorUserId"   BIGINT,
  "entityType"    TEXT,
  "entityId"      TEXT,
  "requestId"     TEXT,
  "callerService" TEXT,
  "payload"       JSONB,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_service_action_ts_idx"
  ON audit."AuditLog" ("service", "action", "ts");

CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx"
  ON audit."AuditLog" ("entityType", "entityId");
