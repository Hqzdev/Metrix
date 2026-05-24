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

export type StreamName = (typeof STREAMS)[keyof typeof STREAMS]
