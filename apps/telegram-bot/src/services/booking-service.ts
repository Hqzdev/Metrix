export type ResourceType = 'desk' | 'office' | 'room' | 'team'

export type BookingLocation = {
  id: string
  name: string
  city: string
  address: string
  occupancy: string
  members: string
}

export type BookingResource = {
  id: string
  locationId: string
  name: string
  type: ResourceType
  seats: string
  occupancy: string
  priceLabel: string
  priceMinorUnits: number
  status: string
}

export type AvailableSlot = {
  id: string
  endsAtIso: string
  startsAt: string
  startsAtIso: string
  endsAt: string
}

export type Booking = {
  id: string
  calendarEventIds?: Partial<Record<'google' | 'microsoft', string>>
  locationId: string
  locationName: string
  resourceId: string
  resourceName: string
  slotId: string
  telegramUserId: number
  paidAmountMinorUnits: number
  priceLabel: string
  startsAt: string
  startsAtIso: string
  endsAt: string
  endsAtIso: string
  status: 'active' | 'cancelled' | 'rescheduled'
}

export type AdminResourceUpdate = {
  occupancy?: string
  priceLabel?: string
  priceMinorUnits?: number
  status?: string
}

export type AdminLocationUpdate = {
  members?: string
  occupancy?: string
}

export type BookingService = {
  blockBusySlots(input: { resourceId: string; slotIds: string[] }): Promise<void>
  listLocations(): Promise<BookingLocation[]>
  listResources(locationId: string): Promise<BookingResource[]>
  listAvailableSlots(resourceId: string): Promise<AvailableSlot[]>
  createBooking(input: {
    telegramUserId: number
    resourceId: string
    slotId: string
  }): Promise<Booking>
  listUserBookings(telegramUserId: number): Promise<Booking[]>
  listAllBookings(): Promise<Booking[]>
  cancelBooking(input: { telegramUserId: number; bookingId: string }): Promise<Booking | null>
  rescheduleBooking(input: { bookingId: string; telegramUserId: number; newSlotId: string }): Promise<Booking>
  updateBookingCalendarEvents(input: {
    bookingId: string
    calendarEventIds: Partial<Record<'google' | 'microsoft', string>>
    telegramUserId: number
  }): Promise<Booking | null>
  updateLocation(input: { locationId: string; update: AdminLocationUpdate }): Promise<BookingLocation>
  updateResource(input: { resourceId: string; update: AdminResourceUpdate }): Promise<BookingResource>
}
