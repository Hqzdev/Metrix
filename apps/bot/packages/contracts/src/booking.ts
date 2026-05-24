// Локация, которую пользователь выбирает перед бронированием.
export type BookingLocation = {
  id: string
  name: string
  city: string
  address: string
  occupancy: string
  members: string
}

// Ресурс внутри локации: комната, стол или офис.
export type BookingResource = {
  id: string
  locationId: string
  name: string
  type: string
  seats: string
  occupancy: string
  priceLabel: string
  priceMinorUnits: number
  status: string
}

// Один доступный временной слот.
export type AvailableSlot = {
  id: string
  startsAt: string
  startsAtIso: string
  endsAt: string
  endsAtIso: string
}

// Бронирование в формате, безопасном для JSON.
export type Booking = {
  id: string
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
  status: 'active' | 'cancelled' | 'completed' | 'rescheduled'
  calendarEventGoogle?: string
  calendarEventMicrosoft?: string
}

// Payload создания booking.
export type CreateBookingInput = {
  telegramUserId: number
  resourceId: string
  slotId: string
}

// Поля, которые можно обновлять у локации.
export type UpdateLocationInput = {
  occupancy?: string
  members?: string
}

// Поля, которые можно обновлять у ресурса.
export type UpdateResourceInput = {
  priceLabel?: string
  priceMinorUnits?: number
  occupancy?: string
  status?: string
}

// Payload ручной блокировки слотов.
export type BlockSlotsInput = {
  resourceId: string
  slotIds: string[]
}

/**
 * Строит slotId для кастомного слота (произвольное время).
 *
 * Формат: `{resourceId}-{YYYYMMDD}-{hour}-{duration}`
 * Используется ботом при формировании брони с выбором даты/времени вручную.
 */
export function buildCustomSlotId(resourceId: string, dateStr: string, hour: number, duration: number): string {
  // Формат должен совпадать с parser-ом в booking-service.
  return `${resourceId}-${dateStr}-${hour}-${duration}`
}
