import type { BookingRow } from './booking-client.js'
 
// Короткая статистика для admin UI.
export type AnalyticsStats = {
  // Количество активных бронирований.
  active: number
  // Количество отменённых бронирований.
  cancelled: number
  // Количество завершённых бронирований.
  completed: number
  // Количество перенесённых бронирований.
  rescheduled: number
  // Выручка в minor units, например в копейках.
  revenue: number
  // Всего бронирований.
  total: number
}

// Более подробная сводка за период.
export type AnalyticsSummary = {
  // Активные бронирования за период.
  activeBookings: number
  // Средняя длительность оплаченного бронирования.
  averageBookingMinutes: number
  // Отменённые бронирования за период.
  cancelledBookings: number
  // Завершённые бронирования за период.
  completedBookings: number
  // Границы периода summary.
  period: {
    dateFrom: string
    dateTo: string
  }
  // Перенесённые бронирования за период.
  rescheduledBookings: number
  // Все бронирования за период.
  totalBookings: number
  // Суммарная занятость ресурсов в минутах.
  totalOccupiedMinutes: number
  // Сколько разных ресурсов были заняты.
  uniqueResources: number
}

// Summary сейчас всегда строится за последние 30 дней.
const SUMMARY_PERIOD_DAYS = 30

/**
 * Считает короткую административную статистику по списку бронирований.
 *
 * Revenue считается по active + completed: обе категории были оплачены.
 * active — бронирования, которые ещё не завершились.
 * completed — бронирования, которые прошли и были автоматически закрыты.
 */
export function calculateStats(bookings: BookingRow[]): AnalyticsStats {
  // active и completed считаются оплаченными для revenue.
  const activeBookings = bookings.filter((booking) => booking.status === 'active')
  const completedBookings = bookings.filter((booking) => booking.status === 'completed')
  const paidBookings = [...activeBookings, ...completedBookings]

  return {
    active: activeBookings.length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    completed: completedBookings.length,
    rescheduled: bookings.filter((booking) => booking.status === 'rescheduled').length,
    revenue: paidBookings.reduce((sum, booking) => sum + booking.paidAmountMinorUnits, 0),
    total: bookings.length,
  }
}

/**
 * Считает summary за последние 30 дней.
 *
 * Период фиксирован для совместимости с текущим Telegram admin UI.
 * В summary включаются все бронирования периода, кроме отменённых:
 * - active: текущие (начались в периоде, ещё не завершились)
 * - completed: прошли (начались в периоде, уже завершились)
 * Revenue и occupancy считаются по active + completed.
 */
export function calculateSummary(bookings: BookingRow[], now = new Date()): AnalyticsSummary {
  // Нижняя граница периода: now минус 30 дней.
  const dateFrom = subtractDays(now, SUMMARY_PERIOD_DAYS)
  // В summary попадают бронирования, которые начались внутри периода.
  const periodBookings = bookings.filter((booking) => new Date(booking.startsAtIso) >= dateFrom)
  // Для расчёта загруженности считаем только оплаченные бронирования (active + completed).
  const paidPeriodBookings = periodBookings.filter(
    (booking) => booking.status === 'active' || booking.status === 'completed',
  )
  // Сумма длительностей нужна для averageBookingMinutes и totalOccupiedMinutes.
  const totalOccupiedMinutes = calculateTotalOccupiedMinutes(paidPeriodBookings)

  return {
    activeBookings: periodBookings.filter((booking) => booking.status === 'active').length,
    averageBookingMinutes: paidPeriodBookings.length > 0 ? Math.round(totalOccupiedMinutes / paidPeriodBookings.length) : 0,
    cancelledBookings: periodBookings.filter((booking) => booking.status === 'cancelled').length,
    completedBookings: periodBookings.filter((booking) => booking.status === 'completed').length,
    period: {
      // Для UI достаточно даты без времени.
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    },
    rescheduledBookings: periodBookings.filter((booking) => booking.status === 'rescheduled').length,
    totalBookings: periodBookings.length,
    totalOccupiedMinutes: Math.round(totalOccupiedMinutes),
    // Set убирает повторы resourceId.
    uniqueResources: new Set(paidPeriodBookings.map((booking) => booking.resourceId)).size,
  }
}

/**
 * Суммирует длительность активных бронирований в минутах.
 */
function calculateTotalOccupiedMinutes(bookings: BookingRow[]): number {
  return bookings.reduce((sum, booking) => {
    // ISO-строки превращаем в timestamp миллисекунды.
    const startsAt = new Date(booking.startsAtIso).getTime()
    const endsAt = new Date(booking.endsAtIso).getTime()
    // Делим на 60_000, чтобы получить минуты.
    return sum + (endsAt - startsAt) / 60_000
  }, 0)
}

/**
 * Возвращает новую дату, сдвинутую назад на указанное число дней.
 */
function subtractDays(date: Date, days: number): Date {
  // Копируем Date, чтобы не менять исходный объект now.
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}
