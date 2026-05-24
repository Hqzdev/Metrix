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
import type { BotLanguage } from './messages.js'

type Urls = {
  // Booking-service отвечает за локации, ресурсы, слоты и бронирования.
  booking: string
  // Calendar-service отвечает за OAuth и подключения календарей.
  calendar: string
  // Payment-service создаёт invoice и обрабатывает Telegram payments.
  payment: string
  // Analytics-service отдаёт статистику и отчёты.
  analytics: string
  // Admin-service проксирует административные чтения.
  admin: string
}

// Ошибка HTTP-вызова во внутренний сервис.
export class ServiceHttpError extends Error {
  constructor(
    message: string,
    // HTTP status downstream-сервиса.
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'ServiceHttpError'
  }
}

/**
 * Инкапсулирует HTTP-вызовы из gateway во внутренние сервисы.
 */
export class ServicesClient {
  // Секрет для подписи service-to-service запросов.
  private readonly signingSecret: string
  // Секрет для подписи Telegram user id.
  private readonly userIdSecret: string

  /**
   * Сохраняет URL сервисов и секреты подписи.
   */
  constructor(
    private readonly urls: Urls,
    secrets: { signing: string; userId: string },
  ) {
    this.signingSecret = secrets.signing
    this.userIdSecret = secrets.userId
  }

  /**
   * Возвращает список локаций для booking flow.
   */
  async listLocations(): Promise<BookingLocation[]> {
    return this.get(`${this.urls.booking}/locations`)
  }

  /**
   * Возвращает ресурсы выбранной локации.
   */
  async listResources(locationId: string): Promise<BookingResource[]> {
    return this.get(`${this.urls.booking}/resources?locationId=${locationId}`)
  }

  /**
   * Получает один ресурс по id.
   */
  async getResource(resourceId: string): Promise<BookingResource> {
    return this.get(`${this.urls.booking}/resources/${resourceId}`)
  }

  /**
   * Возвращает доступные слоты ресурса.
   */
  async listAvailableSlots(resourceId: string): Promise<AvailableSlot[]> {
    return this.get(`${this.urls.booking}/slots?resourceId=${resourceId}`)
  }

  /**
   * Возвращает доступные слоты для конкретной даты (новый flow с датой).
   */
  async listAvailableSlotsForDate(resourceId: string, dateStr: string): Promise<AvailableSlot[]> {
    return this.get(`${this.urls.booking}/slots?resourceId=${resourceId}&date=${dateStr}`)
  }

  async getUserLanguage(telegramUserId: number): Promise<BotLanguage | null> {
    // Preferences endpoint требует подписанный user id.
    const response = await this.get<{ language: BotLanguage | null }>(`${this.urls.booking}/users/me/preferences`, telegramUserId)
    return response.language
  }

  async setUserLanguage(telegramUserId: number, language: BotLanguage): Promise<void> {
    // Сохраняем выбранный язык пользователя в booking-service.
    await this.patch(`${this.urls.booking}/users/me/preferences`, { language }, telegramUserId)
  }

  async createBooking(input: { resourceId: string; slotId: string }, userId: number): Promise<Booking> {
    // Legacy method: сейчас основной путь оплаты идёт через createInvoice.
    return this.post(`${this.urls.booking}/bookings`, input, userId)
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  async listUserBookings(telegramUserId: number): Promise<Booking[]> {
    return this.get(`${this.urls.booking}/bookings`, telegramUserId)
  }

  /**
   * Отменяет бронирование и возвращает обновлённое состояние.
   */
  async cancelBooking(bookingId: string, telegramUserId: number): Promise<Booking | null> {
    return this.patch(`${this.urls.booking}/bookings/${bookingId}`, { status: 'cancelled' }, telegramUserId)
  }

  /**
   * Помечает старое бронирование как перенесённое (rescheduled).
   * Вызывается после successful_payment при наличии rescheduleFromId в сессии.
   */
  async rescheduleBooking(bookingId: string, telegramUserId: number): Promise<Booking | null> {
    try {
      // Старое бронирование помечаем rescheduled после успешной оплаты нового.
      return await this.patch(`${this.urls.booking}/bookings/${bookingId}`, { status: 'rescheduled' }, telegramUserId)
    } catch {
      // Ошибка не должна ломать уже успешную оплату новой брони.
      return null
    }
  }

  /**
   * Обновляет локацию через booking-service.
   */
  async updateLocation(locationId: string, update: UpdateLocationInput): Promise<BookingLocation> {
    return this.patch(`${this.urls.booking}/locations/${locationId}`, update)
  }

  /**
   * Обновляет ресурс через booking-service.
   */
  async updateResource(resourceId: string, update: UpdateResourceInput): Promise<BookingResource> {
    return this.patch(`${this.urls.booking}/resources/${resourceId}`, update)
  }

  async getCalendarAuthUrl(input: { provider: string; telegramUserId: number; scope: string }): Promise<{ url: string } | null> {
    try {
      // Возвращает URL Google OAuth consent.
      return await this.post(`${this.urls.calendar}/auth-url`, input, input.telegramUserId)
    } catch {
      // Если calendar-service недоступен или Google не настроен, UI просто не покажет кнопку.
      return null
    }
  }

  /**
   * Возвращает подключения календаря пользователя.
   */
  async getUserCalendarConnections(telegramUserId: number): Promise<CalendarConnection[]> {
    return this.get(`${this.urls.calendar}/connections?telegramUserId=${telegramUserId}&scope=user`, telegramUserId)
  }

  /**
   * Отключает интеграцию или соединение по запросу пользователя.
   */
  async disconnectCalendar(provider: string, telegramUserId: number): Promise<void> {
    await this.del(`${this.urls.calendar}/connections`, { provider, telegramUserId }, telegramUserId)
  }

  async createInvoice(input: { chatId: number; messageId: number; telegramUserId: number; resourceId: string; slotId: string }): Promise<void> {
    // Payment-service сам отправит invoice через notification-service.
    await this.post(`${this.urls.payment}/invoices`, input, input.telegramUserId)
  }

  /**
   * Прокидывает Telegram payload во внутренний сервис.
   */
  async forwardPreCheckout(query: unknown): Promise<{ ok: boolean; errorMessage?: string }> {
    return this.post(`${this.urls.payment}/pre-checkout`, { query })
  }

  /**
   * Прокидывает Telegram payload во внутренний сервис.
   */
  async forwardSuccessfulPayment(message: unknown): Promise<void> {
    await this.post(`${this.urls.payment}/successful-payment`, { message })
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  async getStats(): Promise<{ total: number; active: number; cancelled: number; revenue: number }> {
    // Stats нужны админской команде /stats.
    return this.get(`${this.urls.analytics}/stats`)
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  async getSummary(): Promise<AnalyticsSummary> {
    return this.get(`${this.urls.analytics}/summary`)
  }

  /**
   * Выполняет шаг requestReport внутри сервисного сценария.
   */
  async requestReport(type: string, requestedBy: number): Promise<{ reportId: string }> {
    return this.post(`${this.urls.analytics}/reports`, { type, requestedBy })
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  async getReport(reportId: string): Promise<{ id: string; status: string; filePath?: string }> {
    return this.get(`${this.urls.analytics}/reports/${reportId}`)
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  async listAllBookings(): Promise<Booking[]> {
    return this.get(`${this.urls.admin}/bookings`)
  }

  /**
   * Готовит заголовки подписи и user id для межсервисного запроса.
   */
  private userHeaders(userId?: number): Record<string, string> {
    // Если user id неизвестен или secret пустой, user headers не добавляем.
    if (!userId || !this.userIdSecret) return {}
    return {
      'x-user-id': String(userId),
      'x-user-sig': signUserId(userId, this.userIdSecret),
    }
  }

  private async get<T>(url: string, userId?: number): Promise<T> {
    // Для подписи важны path и query, но не origin.
    const parsed = new URL(url)
    const authHeaders = buildAuthHeaders('GET', parsed.pathname + parsed.search, '', 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { headers: { ...authHeaders, ...this.userHeaders(userId) }, signal: AbortSignal.timeout(5_000) })
    // Неуспешные ответы превращаем в ServiceHttpError для верхнего уровня.
    if (!res.ok) throw new ServiceHttpError(`GET ${url} failed: ${res.status}`, res.status)
    return res.json() as Promise<T>
  }

  private async post<T>(url: string, body: unknown, userId?: number): Promise<T> {
    // Body должен совпадать с тем, что подписываем.
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('POST', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'POST', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) throw new ServiceHttpError(`POST ${url} failed: ${res.status}`, res.status)
    return res.json() as Promise<T>
  }

  private async patch<T>(url: string, body: unknown, userId?: number): Promise<T> {
    // PATCH используется для отмены/переноса и обновления сущностей.
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('PATCH', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'PATCH', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) throw new ServiceHttpError(`PATCH ${url} failed: ${res.status}`, res.status)
    return res.json() as Promise<T>
  }

  private async del<T>(url: string, body: unknown, userId?: number): Promise<T> {
    // DELETE тоже подписывается вместе с JSON body.
    const parsed = new URL(url)
    const bodyStr = JSON.stringify(body)
    const authHeaders = buildAuthHeaders('DELETE', parsed.pathname, bodyStr, 'bot-gateway', this.signingSecret)
    const res = await fetch(url, { method: 'DELETE', headers: { ...authHeaders, ...this.userHeaders(userId) }, body: bodyStr, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) throw new ServiceHttpError(`DELETE ${url} failed: ${res.status}`, res.status)
    return res.json() as Promise<T>
  }
}
