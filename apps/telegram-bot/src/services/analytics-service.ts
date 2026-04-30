import type { Booking, BookingResource, BookingService } from './booking-service.js'

export type OccupancyHeatmapCell = {
  date: string
  hour: number
  bookings: number
  occupiedMinutes: number
  availableMinutes: number
  occupancyPercent: number
}

export type ResourceUtilization = {
  resourceId: string
  resourceName: string
  occupiedMinutes: number
  availableMinutes: number
  utilizationPercent: number
}

export type PeakHour = {
  hour: number
  bookings: number
  occupiedMinutes: number
  occupancyPercent: number
}

export type AnalyticsSummary = {
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  rescheduledBookings: number
  totalOccupiedMinutes: number
  averageBookingMinutes: number
  uniqueResources: number
  period: { dateFrom: string; dateTo: string }
}

export type AnalyticsFilter = {
  dateFrom: Date
  dateTo: Date
  locationId?: string
  resourceId?: string
}

export class AnalyticsService {
  constructor(private readonly bookingService: BookingService) {}

  async getSummary(filter: AnalyticsFilter): Promise<AnalyticsSummary> {
    const bookings = await this.bookingService.listAllBookings()
    return buildSummary(filterBookings(bookings, filter), filter)
  }

  async getHeatmap(filter: AnalyticsFilter): Promise<OccupancyHeatmapCell[]> {
    const [bookings, resources] = await Promise.all([
      this.bookingService.listAllBookings(),
      this.getAllResources(),
    ])
    const active = filterBookings(bookings, filter).filter((b) => b.status !== 'cancelled')
    return buildHeatmap(active, resources.length)
  }

  async getUtilization(filter: AnalyticsFilter): Promise<ResourceUtilization[]> {
    const [bookings, resources] = await Promise.all([
      this.bookingService.listAllBookings(),
      this.getAllResources(),
    ])
    const active = filterBookings(bookings, filter).filter((b) => b.status !== 'cancelled')
    return buildUtilization(active, resources, filter)
  }

  async getPeakHours(filter: AnalyticsFilter): Promise<PeakHour[]> {
    const [bookings, resources] = await Promise.all([
      this.bookingService.listAllBookings(),
      this.getAllResources(),
    ])
    const active = filterBookings(bookings, filter).filter((b) => b.status !== 'cancelled')
    return buildPeakHours(active, resources.length, filter)
  }

  private async getAllResources(): Promise<BookingResource[]> {
    const locations = await this.bookingService.listLocations()
    const arrays = await Promise.all(locations.map((loc) => this.bookingService.listResources(loc.id)))
    return arrays.flat()
  }
}

function filterBookings(bookings: Booking[], filter: AnalyticsFilter): Booking[] {
  return bookings.filter((b) => {
    const start = new Date(b.startsAtIso)
    return (
      start >= filter.dateFrom &&
      start <= filter.dateTo &&
      (!filter.locationId || b.locationId === filter.locationId) &&
      (!filter.resourceId || b.resourceId === filter.resourceId)
    )
  })
}

function buildSummary(bookings: Booking[], filter: AnalyticsFilter): AnalyticsSummary {
  const nonCancelled = bookings.filter((b) => b.status !== 'cancelled')
  const totalMinutes = sumBookingMinutes(nonCancelled)

  return {
    totalBookings: bookings.length,
    activeBookings: bookings.filter((b) => b.status === 'active').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    rescheduledBookings: bookings.filter((b) => b.status === 'rescheduled').length,
    totalOccupiedMinutes: Math.round(totalMinutes),
    averageBookingMinutes: nonCancelled.length > 0 ? Math.round(totalMinutes / nonCancelled.length) : 0,
    uniqueResources: new Set(nonCancelled.map((b) => b.resourceId)).size,
    period: {
      dateFrom: filter.dateFrom.toISOString().slice(0, 10),
      dateTo: filter.dateTo.toISOString().slice(0, 10),
    },
  }
}

function buildHeatmap(bookings: Booking[], resourceCount: number): OccupancyHeatmapCell[] {
  const cellMap = new Map<string, OccupancyHeatmapCell>()
  const available = 60 * Math.max(resourceCount, 1)

  for (const booking of bookings) {
    for (const { date, hour, minutes } of splitByHour(booking)) {
      const key = `${date}:${hour}`
      const cell = cellMap.get(key)

      if (cell) {
        cell.bookings += 1
        cell.occupiedMinutes += Math.round(minutes)
        cell.occupancyPercent = Math.min(100, Math.round((cell.occupiedMinutes / cell.availableMinutes) * 100))
      } else {
        cellMap.set(key, {
          date,
          hour,
          bookings: 1,
          occupiedMinutes: Math.round(minutes),
          availableMinutes: available,
          occupancyPercent: Math.min(100, Math.round((minutes / available) * 100)),
        })
      }
    }
  }

  return Array.from(cellMap.values()).sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.hour - b.hour,
  )
}

function buildUtilization(
  bookings: Booking[],
  resources: BookingResource[],
  filter: AnalyticsFilter,
): ResourceUtilization[] {
  // 10 рабочих часов в день — предположение при отсутствии таблицы расписания
  const workDays = countWorkingDays(filter.dateFrom, filter.dateTo)
  const available = workDays * 10 * 60

  return resources.map((resource) => {
    const occupied = sumBookingMinutes(bookings.filter((b) => b.resourceId === resource.id))
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      occupiedMinutes: Math.round(occupied),
      availableMinutes: available,
      utilizationPercent: available > 0 ? Math.min(100, Math.round((occupied / available) * 100)) : 0,
    }
  })
}

function buildPeakHours(bookings: Booking[], resourceCount: number, filter: AnalyticsFilter): PeakHour[] {
  const hourMap = new Map<number, { bookings: number; occupiedMinutes: number }>()

  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { bookings: 0, occupiedMinutes: 0 })
  }

  for (const booking of bookings) {
    for (const { hour, minutes } of splitByHour(booking)) {
      const entry = hourMap.get(hour)!
      entry.bookings += 1
      entry.occupiedMinutes += minutes
    }
  }

  const days = countWorkingDays(filter.dateFrom, filter.dateTo)

  return Array.from(hourMap.entries())
    .filter(([, d]) => d.bookings > 0)
    .map(([hour, d]) => {
      const available = 60 * Math.max(resourceCount, 1) * days
      return {
        hour,
        bookings: d.bookings,
        occupiedMinutes: Math.round(d.occupiedMinutes),
        occupancyPercent: available > 0 ? Math.min(100, Math.round((d.occupiedMinutes / available) * 100)) : 0,
      }
    })
    .sort((a, b) => {
      if (b.occupancyPercent !== a.occupancyPercent) return b.occupancyPercent - a.occupancyPercent
      if (b.bookings !== a.bookings) return b.bookings - a.bookings
      return a.hour - b.hour
    })
}

function splitByHour(booking: Booking): Array<{ date: string; hour: number; minutes: number }> {
  const result: Array<{ date: string; hour: number; minutes: number }> = []
  const start = new Date(booking.startsAtIso)
  const end = new Date(booking.endsAtIso)

  const current = new Date(start)
  current.setMinutes(0, 0, 0)

  while (current < end) {
    const next = new Date(current)
    next.setHours(current.getHours() + 1)

    const sliceStart = current < start ? start : current
    const sliceEnd = next < end ? next : end
    const minutes = (sliceEnd.getTime() - sliceStart.getTime()) / 60000

    if (minutes > 0) {
      result.push({ date: current.toISOString().slice(0, 10), hour: current.getHours(), minutes })
    }

    current.setHours(current.getHours() + 1)
  }

  return result
}

function sumBookingMinutes(bookings: Booking[]): number {
  return bookings.reduce(
    (sum, b) => sum + (new Date(b.endsAtIso).getTime() - new Date(b.startsAtIso).getTime()) / 60000,
    0,
  )
}

function countWorkingDays(from: Date, to: Date): number {
  let count = 0
  const current = new Date(from)
  while (current <= to) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return Math.max(count, 1)
}
