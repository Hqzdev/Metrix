import type { Booking } from './booking.js'

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
