import type { Booking } from '@metrix/contracts'

export type BookingRecord = {
  calendarEventGoogle: string | null
  calendarEventMicrosoft: string | null
  endsAt: string
  endsAtIso: Date | string
  id: string
  locationId: string
  locationName: string
  paidAmountMinorUnits: number
  priceLabel: string
  resourceId: string
  resourceName: string
  slotId: string
  startsAt: string
  startsAtIso: Date | string
  status: string
  telegramUserId: bigint | number
}

/**
 * Преобразует Prisma booking row в контракт, безопасный для JSON.
 *
 * BigInt и Date нельзя отдавать наружу напрямую, поэтому сериализация держится
 * в одном месте и не размазывается по route handlers.
 */
export function serializeBooking(booking: BookingRecord): Booking {
  return {
    ...booking,
    calendarEventGoogle: booking.calendarEventGoogle ?? undefined,
    calendarEventMicrosoft: booking.calendarEventMicrosoft ?? undefined,
    endsAtIso: booking.endsAtIso instanceof Date ? booking.endsAtIso.toISOString() : String(booking.endsAtIso),
    startsAtIso: booking.startsAtIso instanceof Date ? booking.startsAtIso.toISOString() : String(booking.startsAtIso),
    status: booking.status as Booking['status'],
    telegramUserId: Number(booking.telegramUserId),
  }
}
