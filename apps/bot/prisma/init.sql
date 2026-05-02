CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS calendar;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS analytics;

-- partial unique index: prevents double-booking the same slot on the same resource
-- Prisma @@unique cannot express a WHERE clause, so we add it here
CREATE UNIQUE INDEX IF NOT EXISTS booking_active_slot_unique
  ON booking."Booking" ("resourceId", "slotId")
  WHERE status = 'active';
