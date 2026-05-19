-- partial unique index: prevents double-booking the same slot on the same resource
-- Prisma @@unique cannot express a WHERE clause, so we apply it after db push.
CREATE UNIQUE INDEX IF NOT EXISTS booking_active_slot_unique
  ON booking."Booking" ("resourceId", "slotId")
  WHERE status = 'active';
