// ─── domain types ─────────────────────────────────────────────────────────────

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
  type: string
  seats: string
  occupancy: string
  priceLabel: string
  priceMinorUnits: number
  status: string
}

export type AvailableSlot = {
  id: string
  startsAt: string
  startsAtIso: string
  endsAt: string
  endsAtIso: string
}

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
  status: 'active' | 'cancelled' | 'rescheduled'
  calendarEventGoogle?: string
  calendarEventMicrosoft?: string
}

export type CalendarConnection = {
  id: string
  provider: 'google' | 'microsoft'
  scope: 'user' | 'resource'
  telegramUserId: number
  resourceId?: string
  calendarId: string
  accessToken?: string
  refreshToken: string
  expiresAt?: string
}

export type PendingInvoice = {
  id: string
  amountMinorUnits: number
  locationId: string
  paidAmountMinorUnits: number
  partNumber: number
  resourceId: string
  slotId: string
  telegramUserId: number
  totalAmountMinorUnits: number
  totalParts: number
}

export type Report = {
  id: string
  type: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  filePath?: string
  error?: string
}

// ─── redis stream names ────────────────────────────────────────────────────────

export const STREAMS = {
  BOOKING_CREATED: 'stream:booking.created',
  BOOKING_CANCELLED: 'stream:booking.cancelled',
  PAYMENT_COMPLETED: 'stream:payment.completed',
  NOTIFICATION_SEND: 'stream:notification.send',
  REPORT_READY: 'stream:report.ready',
} as const

// ─── redis event payloads ──────────────────────────────────────────────────────

export type BookingCreatedEvent = {
  booking: Booking
}

export type BookingCancelledEvent = {
  booking: Booking
}

export type PaymentCompletedEvent = {
  telegramUserId: number
  chatId: number
  resourceId: string
  slotId: string
  totalAmountMinorUnits: number
  invoiceId: string
}

export type NotificationSendEvent =
  | {
      type: 'send_message'
      chatId: number
      text: string
      replyMarkup?: unknown
    }
  | {
      type: 'edit_message'
      chatId: number
      messageId: number
      text: string
      replyMarkup?: unknown
    }
  | {
      type: 'send_document'
      chatId: number
      filePath: string
      caption?: string
    }

export type ReportReadyEvent = {
  reportId: string
  chatId: number
  filePath: string
}

// ─── http api types ────────────────────────────────────────────────────────────

export type CreateBookingInput = {
  telegramUserId: number
  resourceId: string
  slotId: string
}

export type UpdateLocationInput = {
  occupancy?: string
  members?: string
}

export type UpdateResourceInput = {
  priceLabel?: string
  priceMinorUnits?: number
  occupancy?: string
  status?: string
}

export type BlockSlotsInput = {
  resourceId: string
  slotIds: string[]
}

export type CalendarAuthUrlInput = {
  provider: 'google' | 'microsoft'
  telegramUserId: number
  scope: 'user' | 'resource'
  resourceId?: string
}

export type ConnectCalendarInput = {
  code: string
  provider: 'google' | 'microsoft'
  telegramUserId: number
  scope: 'user' | 'resource'
  resourceId?: string
}

export type DisconnectCalendarInput = {
  provider: 'google' | 'microsoft'
  telegramUserId: number
}

export type CreateInvoiceInput = {
  chatId: number
  messageId: number
  telegramUserId: number
  resourceId: string
  slotId: string
  currency: string
  providerToken: string
}

export type AnalyticsSummary = {
  period: { dateFrom: string; dateTo: string }
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  rescheduledBookings: number
  totalOccupiedMinutes: number
  averageBookingMinutes: number
  uniqueResources: number
}
