import { buildAuthHeaders } from '@metrix/auth'
import { DownstreamServiceError } from './errors.js'

// Сколько ждём ответа от booking-service.
const REQUEST_TIMEOUT_MS = 5_000
// Имя сервиса попадает в service-to-service подпись.
const SERVICE_NAME = 'analytics-service'

// Минимальная форма booking, нужная для аналитических расчётов.
export type BookingRow = {
  // ISO-время окончания.
  endsAtIso: string
  // Оплаченная сумма в minor units.
  paidAmountMinorUnits: number
  // Ресурс, по которому считаем уникальную занятость.
  resourceId: string
  // ISO-время начала.
  startsAtIso: string
  // Статус booking: active, completed, cancelled, rescheduled.
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
   * Сохраняет URL booking-service и secret для подписи запросов.
   */
  constructor(
    private readonly bookingServiceUrl: string,
    private readonly signingSecret: string,
  ) {}

  /**
   * Возвращает список бронирований из booking-service.
   */
  async listBookings(): Promise<BookingRow[]> {
    // Подписываем GET /bookings, чтобы booking-service доверял запросу.
    const headers = buildAuthHeaders('GET', '/bookings', '', SERVICE_NAME, this.signingSecret)
    const response = await fetch(`${this.bookingServiceUrl}/bookings`, {
      headers,
      // Таймаут не даёт analytics-service зависнуть навсегда.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Не маскируем ошибку пустой аналитикой.
    if (!response.ok) {
      throw new DownstreamServiceError(`booking-service returned ${response.status}`)
    }

    // Ожидаем JSON-массив бронирований.
    return response.json() as Promise<BookingRow[]>
  }
}
