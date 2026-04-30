export type AdminStatsResponse = {
  active: number
  cancelled: number
  completed: number
  rescheduled: number
  revenueMinorUnits: number
  total: number
}

export type ResourceUtilizationResponse = {
  resourceId: string
  resourceName: string
  utilizationPercent: number
}

export type HourlyOccupancyResponse = {
  date: string
  hour: number
  bookings: number
}

export type ReportExportRequest = {
  dateFrom: string
  dateTo: string
  format: 'pdf'
}
