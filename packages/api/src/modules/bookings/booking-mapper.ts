import type { BookingResponse } from '../../contracts/bookings.js'

export type DbBooking = {
  id: string
  endsAt: Date
  locationId: string
  paidAmountMinorUnits: number
  priceLabel: string
  resourceId: string
  slotId: string | null
  startsAt: Date
  status: 'active' | 'cancelled' | 'completed' | 'rescheduled'
  telegramUserId: bigint | null
  userId: string | null
}

// приводит prisma booking к api contract
export function mapBooking(booking: DbBooking): BookingResponse {
  return {
    id: booking.id,
    endsAt: booking.endsAt.toISOString(),
    locationId: booking.locationId,
    paidAmountMinorUnits: booking.paidAmountMinorUnits,
    priceLabel: booking.priceLabel,
    resourceId: booking.resourceId,
    slotId: booking.slotId ?? undefined,
    startsAt: booking.startsAt.toISOString(),
    status: booking.status,
    telegramUserId: booking.telegramUserId ? Number(booking.telegramUserId) : undefined,
    userId: booking.userId ?? undefined,
  }
}
