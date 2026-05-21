import { buildAuthHeaders } from '@metrix/auth'
import { DownstreamServiceError } from './errors.js'

const REQUEST_TIMEOUT_MS = 5_000
const SERVICE_NAME = 'payment-service'

export type ResourceDetails = {
  locationId: string
  name: string
  priceLabel: string
  priceMinorUnits: number
}

export type AvailableSlot = {
  id: string
}

export type BookingConfirmation = {
  id: string
  endsAt?: string
  locationName?: string
  resourceName?: string
  startsAt?: string
}

type BookingRecord = {
  resourceId: string
  slotId: string
  status: string
}

/**
 * Клиент для межсервисных запросов в booking-service.
 *
 * важно:
 * - все запросы подписываются межсервисными учётными данными.
 * - timeout 5s: зависший booking-service не должен блокировать платёж indefinitely.
 * - ошибки downstream не маскируются — caller решает как реагировать.
 */
export class BookingServiceClient {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(
    private readonly bookingServiceUrl: string,
    private readonly signingSecret: string,
  ) {}

  /**
   * Загружает детали ресурса для расчёта суммы инвойса.
   *
   * Возвращает null, если ресурс не найден (404).
   * Бросает DownstreamServiceError при других ошибках — это production incident.
   */
  async getResource(resourceId: string): Promise<ResourceDetails | null> {
    const path = `/resources/${resourceId}`
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.status === 404) return null

    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status} for GET ${path}`)
    }

    return response.json() as Promise<ResourceDetails>
  }

  async isSlotAvailable(resourceId: string, slotId: string): Promise<boolean> {
    const path = `/slots?resourceId=${encodeURIComponent(resourceId)}`
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status} for GET ${path}`)
    }

    const slots = (await response.json()) as AvailableSlot[]
    if (slots.some((slot) => slot.id === slotId)) return true

    if (!isCustomSlotId(resourceId, slotId)) return false

    const activeBookings = await this.listBookings()
    return !activeBookings.some((booking) => booking.resourceId === resourceId && booking.slotId === slotId && booking.status === 'active')
  }

  private async listBookings(): Promise<BookingRecord[]> {
    const path = '/bookings'
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status} for GET ${path}`)
    }

    return response.json() as Promise<BookingRecord[]>
  }

  /**
   * Создаёт бронирование после успешной оплаты.
   *
   * Вызывается из consumer PAYMENT_COMPLETED — бронирование должно быть
   * создано атомарно с подтверждением платежа.
   */
  async createBooking(
    telegramUserId: number,
    resourceId: string,
    slotId: string,
    idempotencyKey: string,
  ): Promise<BookingConfirmation> {
    const path = '/bookings'
    const body = JSON.stringify({ telegramUserId, resourceId, slotId, idempotencyKey })
    const headers = buildAuthHeaders('POST', path, body, SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status} for POST ${path}`)
    }

    return response.json() as Promise<BookingConfirmation>
  }
}

function isCustomSlotId(resourceId: string, slotId: string): boolean {
  const prefix = `${resourceId}-`
  if (!slotId.startsWith(prefix)) return false

  const suffix = slotId.slice(prefix.length)
  const parts = suffix.split('-')
  if (parts.length !== 3) return false

  const [dateStr, hourStr, durationStr] = parts
  if (!/^\d{8}$/.test(dateStr)) return false

  const hour = Number(hourStr)
  const duration = Number(durationStr)
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(duration) && duration >= 1 && duration <= 8 && hour + duration <= 24
}
