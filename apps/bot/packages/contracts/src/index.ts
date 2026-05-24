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

// Подключение внешнего календаря пользователя или ресурса.
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

// Pending invoice для оплаты бронирования.
export type PendingInvoice = {
  id: string
  amountMinorUnits: number
  status: 'pending' | 'paid_part' | 'completed' | 'failed' | 'expired'
  holdId?: string
  locationId: string
  paidAmountMinorUnits: number
  partNumber: number
  resourceId: string
  slotId: string
  telegramUserId: number
  totalAmountMinorUnits: number
  totalParts: number
}

// Report запись для фоновой генерации отчёта.
export type Report = {
  id: string
  type: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  filePath?: string
  error?: string
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

/**
 * Имена Redis Streams для межсервисного обмена событиями.
 *
 * Константы — единственный источник истины для имён стримов.
 * Имя стрима нельзя менять без миграции всех consumer groups в Redis.
 */
export const STREAMS = {
  BOOKING_CREATED: 'stream:booking.created',
  BOOKING_CANCELLED: 'stream:booking.cancelled',
  BOOKING_COMPLETED: 'stream:booking.completed',
  PAYMENT_COMPLETED: 'stream:payment.completed',
  NOTIFICATION_SEND: 'stream:notification.send',
  REPORT_READY: 'stream:report.ready',
} as const

// Событие создания бронирования.
export type BookingCreatedEvent = {
  booking: Booking
}

// Событие отмены бронирования.
export type BookingCancelledEvent = {
  booking: Booking
}

// Событие завершения бронирования.
export type BookingCompletedEvent = {
  booking: Booking
}

// Событие полной оплаты invoice.
export type PaymentCompletedEvent = {
  telegramUserId: number
  chatId: number
  resourceId: string
  slotId: string
  totalAmountMinorUnits: number
  invoiceId: string
}

// События, которые notification-service превращает в Telegram API calls.
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
      type: 'send_invoice'
      chatId: number
      invoiceId: string
      title: string
      description: string
      payload: string
      providerToken: string
      currency: string
      amount: number
    }
  | {
      type: 'send_document'
      chatId: number
      filePath: string
      caption?: string
    }

// Событие готового отчёта.
export type ReportReadyEvent = {
  reportId: string
  chatId: number
  filePath: string
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

// Payload запроса OAuth URL календаря.
export type CalendarAuthUrlInput = {
  provider: 'google' | 'microsoft'
  telegramUserId: number
  scope: 'user' | 'resource'
  resourceId?: string
}

// Payload подключения календаря после OAuth.
export type ConnectCalendarInput = {
  code: string
  provider: 'google' | 'microsoft'
  telegramUserId: number
  scope: 'user' | 'resource'
  resourceId?: string
}

// Payload отключения календаря.
export type DisconnectCalendarInput = {
  provider: 'google' | 'microsoft'
  telegramUserId: number
}

// Payload создания invoice.
export type CreateInvoiceInput = {
  chatId: number
  messageId: number
  telegramUserId: number
  resourceId: string
  slotId: string
  currency: string
  providerToken: string
}

// Summary analytics за период.
export type AnalyticsSummary = {
  period: { dateFrom: string; dateTo: string }
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  completedBookings: number
  rescheduledBookings: number
  totalOccupiedMinutes: number
  averageBookingMinutes: number
  uniqueResources: number
}
