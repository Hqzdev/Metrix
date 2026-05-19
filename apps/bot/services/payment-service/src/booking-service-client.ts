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
    return slots.some((slot) => slot.id === slotId)
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
