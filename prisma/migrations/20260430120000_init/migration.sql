CREATE TYPE "UserRole" AS ENUM ('admin', 'employee');
CREATE TYPE "ResourceType" AS ENUM ('desk', 'office', 'room', 'team');
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled', 'completed', 'rescheduled');
CREATE TYPE "CalendarProvider" AS ENUM ('google', 'microsoft');
CREATE TYPE "CalendarConnectionScope" AS ENUM ('resource', 'user');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'employee',
  "telegramUserId" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "occupancy" TEXT NOT NULL,
  "members" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ResourceType" NOT NULL,
  "seats" TEXT NOT NULL,
  "occupancy" TEXT NOT NULL,
  "priceLabel" TEXT NOT NULL,
  "priceMinorUnits" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Slot" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "telegramUserId" BIGINT,
  "locationId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "slotId" TEXT,
  "paidAmountMinorUnits" INTEGER NOT NULL,
  "priceLabel" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarConnection" (
  "id" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "scope" "CalendarConnectionScope" NOT NULL,
  "userId" TEXT,
  "telegramUserId" BIGINT,
  "resourceId" TEXT,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "accessTokenEnc" TEXT,
  "refreshTokenEnc" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Resource_locationId_idx" ON "Resource"("locationId");
CREATE INDEX "Slot_resourceId_startsAt_endsAt_idx" ON "Slot"("resourceId", "startsAt", "endsAt");
CREATE INDEX "Booking_resourceId_startsAt_endsAt_status_idx" ON "Booking"("resourceId", "startsAt", "endsAt", "status");
CREATE INDEX "Booking_telegramUserId_idx" ON "Booking"("telegramUserId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE UNIQUE INDEX "CalendarConnection_provider_scope_telegramUserId_resourceId_key" ON "CalendarConnection"("provider", "scope", "telegramUserId", "resourceId");
CREATE INDEX "CalendarConnection_resourceId_idx" ON "CalendarConnection"("resourceId");
CREATE INDEX "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");
CREATE UNIQUE INDEX "CalendarEvent_provider_eventId_key" ON "CalendarEvent"("provider", "eventId");
CREATE INDEX "CalendarEvent_bookingId_idx" ON "CalendarEvent"("bookingId");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
