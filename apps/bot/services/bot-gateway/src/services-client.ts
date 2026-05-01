import type {
  AnalyticsSummary,
  AvailableSlot,
  Booking,
  BookingLocation,
  BookingResource,
  CalendarConnection,
  CreateBookingInput,
  UpdateLocationInput,
  UpdateResourceInput,
} from '@metrix/contracts'

type Urls = {
  booking: string
  calendar: string
  payment: string
  analytics: string
  admin: string
}

// единый http-клиент для вызовов между сервисами
export class ServicesClient {
  constructor(private readonly urls: Urls) {}

  // booking-service
  async listLocations(): Promise<BookingLocation[]> {
    return this.get(`${this.urls.booking}/locations`)
  }

  async listResources(locationId: string): Promise<BookingResource[]> {
    return this.get(`${this.urls.booking}/resources?locationId=${locationId}`)
  }

  async getResource(resourceId: string): Promise<BookingResource> {
    return this.get(`${this.urls.booking}/resources/${resourceId}`)
  }

  async listAvailableSlots(resourceId: string): Promise<AvailableSlot[]> {
    return this.get(`${this.urls.booking}/slots?resourceId=${resourceId}`)
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    return this.post(`${this.urls.booking}/bookings`, input)
  }

  async listUserBookings(telegramUserId: number): Promise<Booking[]> {
    return this.get(`${this.urls.booking}/bookings?telegramUserId=${telegramUserId}`)
  }

  async cancelBooking(bookingId: string, telegramUserId: number): Promise<Booking | null> {
    return this.patch(`${this.urls.booking}/bookings/${bookingId}`, { status: 'cancelled', telegramUserId })
  }

  async updateLocation(locationId: string, update: UpdateLocationInput): Promise<BookingLocation> {
    return this.patch(`${this.urls.booking}/locations/${locationId}`, update)
  }

  async updateResource(resourceId: string, update: UpdateResourceInput): Promise<BookingResource> {
    return this.patch(`${this.urls.booking}/resources/${resourceId}`, update)
  }

  // calendar-service
  async getCalendarAuthUrl(input: {
    provider: string
    telegramUserId: number
    scope: string
  }): Promise<{ url: string } | null> {
    try {
      return this.post(`${this.urls.calendar}/auth-url`, input)
    } catch {
      return null
    }
  }

  async getUserCalendarConnections(telegramUserId: number): Promise<CalendarConnection[]> {
    return this.get(`${this.urls.calendar}/connections?telegramUserId=${telegramUserId}&scope=user`)
  }

  async disconnectCalendar(provider: string, telegramUserId: number): Promise<void> {
    await this.del(`${this.urls.calendar}/connections`, { provider, telegramUserId })
  }

  // payment-service
  async createInvoice(input: {
    chatId: number
    messageId: number
    telegramUserId: number
    resourceId: string
    slotId: string
  }): Promise<void> {
    await this.post(`${this.urls.payment}/invoices`, input)
  }

  async forwardPreCheckout(query: unknown): Promise<{ ok: boolean; errorMessage?: string }> {
    return this.post(`${this.urls.payment}/pre-checkout`, { query })
  }

  async forwardSuccessfulPayment(message: unknown): Promise<void> {
    await this.post(`${this.urls.payment}/successful-payment`, { message })
  }

  // analytics-service
  async getStats(): Promise<{ total: number; active: number; cancelled: number; revenue: number }> {
    return this.get(`${this.urls.analytics}/stats`)
  }

  async getSummary(): Promise<AnalyticsSummary> {
    return this.get(`${this.urls.analytics}/summary`)
  }

  async requestReport(type: string, requestedBy: number): Promise<{ reportId: string }> {
    return this.post(`${this.urls.analytics}/reports`, { type, requestedBy })
  }

  async getReport(reportId: string): Promise<{ id: string; status: string; filePath?: string }> {
    return this.get(`${this.urls.analytics}/reports/${reportId}`)
  }

  // admin-service
  async listAllBookings(): Promise<Booking[]> {
    return this.get(`${this.urls.admin}/bookings`)
  }

  private async get<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async patch<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async del<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }
}
