import type { BookingRow } from './booking-client.js'

export type AnalyticsStats = {
  active: number
  cancelled: number
  rescheduled: number
  revenue: number
  total: number
}

export type AnalyticsSummary = {
  activeBookings: number
  averageBookingMinutes: number
  cancelledBookings: number
  period: {
    dateFrom: string
    dateTo: string
  }
  rescheduledBookings: number
  totalBookings: number
  totalOccupiedMinutes: number
  uniqueResources: number
}

const SUMMARY_PERIOD_DAYS = 30

/**
 * Считает короткую административную статистику по списку бронирований.
 */
export function calculateStats(bookings: BookingRow[]): AnalyticsStats {
  const activeBookings = bookings.filter((booking) => booking.status === 'active')

  return {
    active: activeBookings.length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    rescheduled: bookings.filter((booking) => booking.status === 'rescheduled').length,
    revenue: activeBookings.reduce((sum, booking) => sum + booking.paidAmountMinorUnits, 0),
    total: bookings.length,
  }
}

/**
 * Считает summary за последние 30 дней.
 *
 * Период фиксирован для совместимости с текущим Telegram admin UI.
 */
export function calculateSummary(bookings: BookingRow[], now = new Date()): AnalyticsSummary {
  const dateFrom = subtractDays(now, SUMMARY_PERIOD_DAYS)
  const periodBookings = bookings.filter((booking) => new Date(booking.startsAtIso) >= dateFrom)
  const totalOccupiedMinutes = calculateTotalOccupiedMinutes(periodBookings)

  return {
    activeBookings: periodBookings.filter((booking) => booking.status === 'active').length,
    averageBookingMinutes: periodBookings.length > 0 ? Math.round(totalOccupiedMinutes / periodBookings.length) : 0,
    cancelledBookings: periodBookings.filter((booking) => booking.status === 'cancelled').length,
    period: {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    },
    rescheduledBookings: periodBookings.filter((booking) => booking.status === 'rescheduled').length,
    totalBookings: periodBookings.length,
    totalOccupiedMinutes: Math.round(totalOccupiedMinutes),
    uniqueResources: new Set(periodBookings.map((booking) => booking.resourceId)).size,
  }
}

/**
 * Суммирует длительность активных бронирований в минутах.
 */
function calculateTotalOccupiedMinutes(bookings: BookingRow[]): number {
  return bookings.reduce((sum, booking) => {
    const startsAt = new Date(booking.startsAtIso).getTime()
    const endsAt = new Date(booking.endsAtIso).getTime()
    return sum + (endsAt - startsAt) / 60_000
  }, 0)
}

/**
 * Возвращает новую дату, сдвинутую назад на указанное число дней.
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}
