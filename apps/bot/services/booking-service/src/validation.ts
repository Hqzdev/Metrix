import type { BlockSlotsInput, CreateBookingInput, UpdateLocationInput, UpdateResourceInput } from '@metrix/contracts'
import { ValidationError } from './errors.js'

// Обычный JSON-объект: не null и не массив.
type JsonObject = Record<string, unknown>

// Через пользовательский endpoint разрешаем только отмену или перенос.
const ALLOWED_BOOKING_STATUSES = ['cancelled', 'rescheduled'] as const

// Payload для изменения статуса booking.
export type UpdateBookingStatusInput = {
  status: (typeof ALLOWED_BOOKING_STATUSES)[number]
}

/**
 * Валидирует создание бронирования.
 *
 * userId может прийти из подписанного заголовка или из body для автоматических
 * internal calls, поэтому callerUserId передаётся отдельно.
 */
export function parseCreateBookingInput(input: unknown, callerUserId: number | undefined): CreateBookingInput {
  // Тело должно быть объектом, иначе поля читать небезопасно.
  const body = requireObject(input)
  // Если user id уже проверен подписью, он важнее значения из body.
  const rawUserId = callerUserId ?? body.telegramUserId

  return {
    resourceId: requireString(body.resourceId, 'resourceId'),
    slotId: requireString(body.slotId, 'slotId'),
    telegramUserId: requirePositiveInteger(rawUserId, 'telegramUserId'),
  }
} 

/**
 * Валидирует изменение статуса бронирования.
 */
export function parseUpdateBookingStatusInput(input: unknown): UpdateBookingStatusInput {
  // Проверяем, что body похож на JSON-объект.
  const body = requireObject(input)
  // status должен быть непустой строкой.
  const status = requireString(body.status, 'status')

  // Не даём клиенту поставить любой произвольный статус.
  if (!ALLOWED_BOOKING_STATUSES.includes(status as UpdateBookingStatusInput['status'])) {
    throw new ValidationError('status must be cancelled or rescheduled')
  }

  return { status: status as UpdateBookingStatusInput['status'] }
}

/**
 * Валидирует payload блокировки слотов из календарной синхронизации.
 */
export function parseBlockSlotsInput(input: unknown): BlockSlotsInput {
  // Блокировка слотов приходит JSON-объектом.
  const body = requireObject(input)
  const slotIds = body.slotIds

  // Каждый slotId должен быть непустой строкой.
  if (!Array.isArray(slotIds) || slotIds.some((slotId) => typeof slotId !== 'string' || slotId.trim() === '')) {
    throw new ValidationError('slotIds must be a non-empty string array')
  }

  return {
    resourceId: requireString(body.resourceId, 'resourceId'),
    slotIds,
  }
}

/**
 * Валидирует и фильтрует поля обновления локации.
 */
export function parseUpdateLocationInput(input: unknown): UpdateLocationInput {
  // Сначала требуем объект.
  const body = requireObject(input)
  // safeBody защищает от mass assignment: лишние поля игнорируются.
  const safeBody: UpdateLocationInput = {}

  // occupancy и members — единственные поля локации, которые можно менять здесь.
  if (body.occupancy !== undefined) safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  if (body.members !== undefined) safeBody.members = requireString(body.members, 'members')

  return requireAtLeastOneField(safeBody)
}

/**
 * Валидирует и фильтрует поля обновления ресурса.
 */
export function parseUpdateResourceInput(input: unknown): UpdateResourceInput {
  // Сначала требуем объект.
  const body = requireObject(input)
  // safeBody содержит только разрешённые для обновления поля.
  const safeBody: UpdateResourceInput = {}

  // Каждое поле проверяем отдельно, потому что типы у них разные.
  if (body.priceLabel !== undefined) safeBody.priceLabel = requireString(body.priceLabel, 'priceLabel')
  if (body.priceMinorUnits !== undefined) safeBody.priceMinorUnits = requirePositiveNumber(body.priceMinorUnits, 'priceMinorUnits')
  if (body.occupancy !== undefined) safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  if (body.status !== undefined) safeBody.status = requireString(body.status, 'status')

  return requireAtLeastOneField(safeBody)
}

/**
 * Извлекает опциональный idempotency key из тела запроса.
 *
 * Ключ должен быть строкой если передан. Клиент генерирует его перед отправкой
 * и повторяет тот же ключ при retry — это гарантирует идемпотентность создания.
 */
export function parseIdempotencyKey(input: unknown): string | null {
  // Если body не объект, idempotency key точно нет.
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  const key = body.idempotencyKey
  // Отсутствие ключа допустимо: просто не будет защиты от повторного POST.
  if (key === undefined || key === null) return null
  // Невалидный ключ игнорируем, чтобы не ломать legacy-клиентов.
  if (typeof key !== 'string' || key.trim() === '') return null
  return key.trim()
}

/**
 * Извлекает обязательный path id из маршрута.
 *
 * Проверяет, что путь начинается с ожидаемого prefix, прежде чем делать slice.
 * Это защищает от случайного вызова с неправильным путём вне dispatch-контекста.
 */
export function readIdFromPath(path: string, prefix: string): string {
  // Проверяем соответствие prefix, прежде чем вырезать id.
  if (!path.startsWith(prefix)) {
    throw new ValidationError('invalid path')
  }

  // Берём всё, что находится после prefix.
  const id = path.slice(prefix.length)
  if (id.trim() === '') {
    throw new ValidationError('id is required')
  }

  return id
}

/**
 * Гарантирует, что входное значение является JSON-объектом.
 */
function requireObject(input: unknown): JsonObject {
  // typeof null === 'object', поэтому null проверяем явно.
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  return input as JsonObject
}

/**
 * Гарантирует, что поле передано непустой строкой.
 */
function requireString(value: unknown, fieldName: string): string {
  // Пустая строка не считается валидным значением.
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`invalid ${fieldName}`)
  }

  return value
}

/**
 * Гарантирует, что поле передано положительным целым числом.
 */
function requirePositiveInteger(value: unknown, fieldName: string): number {
  // Number позволяет принять и число, и строковое число из внутренних вызовов.
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ValidationError(`invalid ${fieldName}`)
  }

  return numberValue
}

/**
 * Гарантирует, что поле передано положительным числом.
 */
function requirePositiveNumber(value: unknown, fieldName: string): number {
  // Number.isFinite отсекает NaN и Infinity.
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`)
  }

  return value
}

/**
 * Проверяет, что после фильтрации payload не стал пустым.
 */
function requireAtLeastOneField<T extends Record<string, unknown>>(value: T): T {
  // Если нет ни одного разрешённого поля, update не имеет смысла.
  if (Object.keys(value).length === 0) {
    throw new ValidationError('no valid fields to update')
  }

  return value
}
