import type { BlockSlotsInput, CreateBookingInput, UpdateLocationInput, UpdateResourceInput } from '@metrix/contracts'
import { ValidationError } from './errors.js'

type JsonObject = Record<string, unknown>

const ALLOWED_BOOKING_STATUSES = ['cancelled', 'rescheduled'] as const

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
  const body = requireObject(input)
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
  const body = requireObject(input)
  const status = requireString(body.status, 'status')

  if (!ALLOWED_BOOKING_STATUSES.includes(status as UpdateBookingStatusInput['status'])) {
    throw new ValidationError('status must be cancelled or rescheduled')
  }

  return { status: status as UpdateBookingStatusInput['status'] }
}

/**
 * Валидирует payload блокировки слотов из календарной синхронизации.
 */
export function parseBlockSlotsInput(input: unknown): BlockSlotsInput {
  const body = requireObject(input)
  const slotIds = body.slotIds

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
  const body = requireObject(input)
  const safeBody: UpdateLocationInput = {}

  if (body.occupancy !== undefined) safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  if (body.members !== undefined) safeBody.members = requireString(body.members, 'members')

  return requireAtLeastOneField(safeBody)
}

/**
 * Валидирует и фильтрует поля обновления ресурса.
 */
export function parseUpdateResourceInput(input: unknown): UpdateResourceInput {
  const body = requireObject(input)
  const safeBody: UpdateResourceInput = {}

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
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  const key = body.idempotencyKey
  if (key === undefined || key === null) return null
  if (typeof key !== 'string' || key.trim() === '') return null
  return key.trim()
}

/**
 * Извлекает обязательный path id из маршрута.
 */
export function readIdFromPath(path: string, prefix: string): string {
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
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  return input as JsonObject
}

/**
 * Гарантирует, что поле передано непустой строкой.
 */
function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`invalid ${fieldName}`)
  }

  return value
}

/**
 * Гарантирует, что поле передано положительным целым числом.
 */
function requirePositiveInteger(value: unknown, fieldName: string): number {
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
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`)
  }

  return value
}

function requireAtLeastOneField<T extends Record<string, unknown>>(value: T): T {
  if (Object.keys(value).length === 0) {
    throw new ValidationError('no valid fields to update')
  }

  return value
}
