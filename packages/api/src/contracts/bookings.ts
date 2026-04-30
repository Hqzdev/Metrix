export type BookingStatus = 'active' | 'cancelled' | 'completed' | 'rescheduled'

export type BookingResponse = {
  id: string
  endsAt: string
  locationId: string
  paidAmountMinorUnits: number
  priceLabel: string
  resourceId: string
  slotId?: string
  startsAt: string
  status: BookingStatus
  telegramUserId?: number
  userId?: string
}

export type CreateBookingRequest = {
  resourceId: string
  slotId?: string
  startsAt?: string
  endsAt?: string
  telegramUserId?: number
  userId?: string
}

export type CancelBookingRequest = {
  bookingId: string
  telegramUserId?: number
  userId?: string
}

export type RescheduleBookingRequest = {
  bookingId: string
  newSlotId: string
  telegramUserId?: number
  userId?: string
}

export type ListBookingsQuery = {
  resourceId?: string
  status?: BookingStatus
  telegramUserId?: number
  userId?: string
}
