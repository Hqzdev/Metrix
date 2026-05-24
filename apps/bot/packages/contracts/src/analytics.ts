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
