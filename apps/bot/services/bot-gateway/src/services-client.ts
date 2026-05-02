import type {
  AnalyticsSummary,
  AvailableSlot,
  Booking,
  BookingLocation,
  BookingResource,
  CalendarConnection,
  UpdateLocationInput,
  UpdateResourceInput,
} from '@metrix/contracts'
import { buildAuthHeaders, signUserId } from '@metrix/auth'

type Urls = {
  booking: string
  calendar: string
  payment: string
  analytics: string
  admin: string
}

export class ServicesClient {
  private readonly signingSecret: string
  private readonly userIdSecret: string

  constructor(
    private readonly urls: Urls,
    secrets: { signing: string; userId: string },
  ) {
    this.signingSecret = secrets.signing
    this.userIdSecret = secrets.userId
  }

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

  async createBooking(input: { resourceId: string; slotId: string }, userId: number): Promise<Booking> {
    return this.post(`${this.urls.booking}/bookings`, input, userId)
  }

  async listUserBookings(telegramUserId: number): Promise<Booking[]> {
    return this.get(`${this.urls.booking}/bookings`, telegramUserId)
  }

  async cancelBooking(bookingId: string, telegramUserId: number): Promise<Booking | null> {
    return this.patch(`${this.urls.booking}/bookings/${bookingId}`, { status: 'cancelled' }, telegramUserId)
  }

  async updateLocation(locationId: string, update: UpdateLocationInput): Promise<BookingLocation> {
    return this.patch(`${this.urls.booking}/locations/${locationId}`, update)
  }

  async updateResource(resourceId: string, update: UpdateResourceInput): Promise<BookingResource> {
    return this.patch(`${this.urls.booking}/resources/${resourceId}`, update)
  }

  async getCalendarAuthUrl(input: { provider: string; telegramUserId: number; scope: string }): Promise<{ url: string } | null> {
    try {
      return this.post(`${this.urls.calendar}/auth-url`, input, input.telegramUserId)
    } catch {
      return null
    }
  }

  async getUserCalendarConnections(telegramUserId: number): Promise<CalendarConnection[]> {
    return this.get(`${this.urls.calendar}/connections?telegramUserId=${telegramUserId}&scope=user`, telegramUserId)
  }

  async disconnectCalendar(provider: string, telegramUserId: number): Promise<void> {
    await this.del(`${this.urls.calendar}/connections`, { provider, telegramUserId }, telegramUserId)
  }

  async createInvoice(input: { chatId: number; messageId: number; telegramUserId: number; resourceId: string; slotId: string }): Promise<void> {
    await this.post(`${this.urls.payment}/invoices`, input, input.telegramUserId)
  }

  async forwardPreCheckout(query: unknown): Promise<{ ok: boolean; errorMessage?: string }> {
    return this.post(`${this.urls.payment}/pre-checkout`, { query })
  }

  async forwardSuccessfulPayment(message: unknown): Promise<void> {
    await this.post(`${this.urls.payment}/successful-payment`, { message })
  }

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

  async listAllBookings(): Promise<Booking[]> {
    return this.get(`${this.urls.admin}/bookings`)
  }

  private userHeaders(userId?: number): Record<string, string> {
    if (!userId || !this.userIdSecret) return {}
    return {
      'x-user-id': String(userId),
      'x-user-sig': signUserId(userId, this.userIdSecret),
    }
  }

  private async get<T>(url: string, userId?: number): Promise<T> {
    const parsed = new URL(url)
    const authHeaders = buildAuthHeaders('GET', parsed.pathname + parsed.search, '', 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { headers: { ...authHeaders, ...this.userHeaders(userId) } })
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async post<T>(url: string, body: unknown, userId?: number): Promise<T> {
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('POST', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'POST', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr })
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async patch<T>(url: string, body: unknown, userId?: number): Promise<T> {
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('PATCH', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'PATCH', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr })
    if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private async del<T>(url: string, body: unknown, userId?: number): Promise<T> {
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('DELETE', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'DELETE', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr })
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`)
    return res.json() as Promise<T>
  }
}
