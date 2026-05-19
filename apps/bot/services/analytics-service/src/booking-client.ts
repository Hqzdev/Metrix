import { buildAuthHeaders } from '@metrix/auth'
import { DownstreamServiceError } from './errors.js'

const REQUEST_TIMEOUT_MS = 5_000
const SERVICE_NAME = 'analytics-service'

export type BookingRow = {
  endsAtIso: string
  paidAmountMinorUnits: number
  resourceId: string
  startsAtIso: string
  status: string
}

/**
 * Загружает факты бронирований из booking-service подписанным запросом.
 *
 * Ошибки downstream-сервиса не маскируются пустым массивом, потому что это
 * исказит аналитику и скроет production incident.
 */
export class BookingClient {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(
    private readonly bookingServiceUrl: string,
    private readonly signingSecret: string,
  ) {}

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  async listBookings(): Promise<BookingRow[]> {
    const headers = buildAuthHeaders('GET', '/bookings', '', SERVICE_NAME, this.signingSecret)
    const response = await fetch(`${this.bookingServiceUrl}/bookings`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status}`)
    }

    return response.json() as Promise<BookingRow[]>
  }
}
