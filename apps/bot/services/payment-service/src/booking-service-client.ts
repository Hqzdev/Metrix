import { buildAuthHeaders } from '@metrix/auth'
import { DownstreamServiceError } from './errors.js'

// Максимальное ожидание ответа booking-service.
const REQUEST_TIMEOUT_MS = 5_000
// Имя сервиса для service-to-service подписи.
const SERVICE_NAME = 'payment-service'

// Данные ресурса, нужные для invoice.
export type ResourceDetails = {
  // Локация ресурса.
  locationId: string
  // Название ресурса.
  name: string
  // Цена для отображения.
  priceLabel: string
  // Цена в minor units.
  priceMinorUnits: number
}

// Минимальная форма слота из booking-service.
export type AvailableSlot = {
  id: string
}

// Ответ booking-service после создания booking.
export type BookingConfirmation = {
  id: string
  endsAt?: string
  locationName?: string
  resourceName?: string
  startsAt?: string
}

// Минимальная форма booking для проверки кастомного слота.
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
   * Сохраняет URL booking-service и secret для подписи.
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
    // Подписываем GET /resources/:id.
    const path = `/resources/${resourceId}`
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // 404 — нормальная бизнес-ситуация: ресурса нет.
    if (response.status === 404) return null

    // Остальные ошибки считаем проблемой downstream-сервиса.
    if (!response.ok) {
      throw new DownstreamServiceError(response.status, await readResponseBody(response))
    }

    return response.json() as Promise<ResourceDetails>
  }

  /**
   * Проверяет, доступен ли слот для оплаты.
   */
  async isSlotAvailable(resourceId: string, slotId: string): Promise<boolean> {
    // Стандартные слоты берём из /slots.
    const path = `/slots?resourceId=${encodeURIComponent(resourceId)}`
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(response.status, await readResponseBody(response))
    }

    // Если slotId есть в списке доступных, можно платить.
    const slots = (await response.json()) as AvailableSlot[]
    if (slots.some((slot) => slot.id === slotId)) return true

    // Кастомные слоты могут не попасть в /slots, поэтому проверяем их отдельно.
    if (!isCustomSlotId(resourceId, slotId)) return false

    // Для кастомного слота смотрим активные бронирования напрямую.
    const activeBookings = await this.listBookings()
    return !activeBookings.some((booking) => booking.resourceId === resourceId && booking.slotId === slotId && booking.status === 'active')
  }

  /**
   * Загружает бронирования для проверки кастомных слотов.
   */
  private async listBookings(): Promise<BookingRecord[]> {
    const path = '/bookings'
    const headers = buildAuthHeaders('GET', path, '', SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DownstreamServiceError(response.status, await readResponseBody(response))
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
    // idempotencyKey связывает booking с invoice и защищает от повторного создания.
    const path = '/bookings'
    const body = JSON.stringify({ telegramUserId, resourceId, slotId, idempotencyKey })
    const headers = buildAuthHeaders('POST', path, body, SERVICE_NAME, this.signingSecret)

    const response = await fetch(`${this.bookingServiceUrl}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Если booking-service не создал бронь, payment consumer переведёт saga в failed.
    if (!response.ok) {
      throw new DownstreamServiceError(response.status, await readResponseBody(response))
    }

    return response.json() as Promise<BookingConfirmation>
  }
}

/**
 * Читает тело ответа booking-service для диагностики downstream-ошибок.
 */
async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

/**
 * Проверяет формат кастомного slotId.
 */
function isCustomSlotId(resourceId: string, slotId: string): boolean {
  // Кастомный slotId должен начинаться с resourceId.
  const prefix = `${resourceId}-`
  if (!slotId.startsWith(prefix)) return false

  // После resourceId ожидаем YYYYMMDD-hour-duration.
  const suffix = slotId.slice(prefix.length)
  const parts = suffix.split('-')
  if (parts.length !== 3) return false

  // Дата должна быть строго YYYYMMDD.
  const [dateStr, hourStr, durationStr] = parts
  if (!/^\d{8}$/.test(dateStr)) return false

  // Проверяем разумные границы часа и длительности.
  const hour = Number(hourStr)
  const duration = Number(durationStr)
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(duration) && duration >= 1 && duration <= 8 && hour + duration <= 24
}
