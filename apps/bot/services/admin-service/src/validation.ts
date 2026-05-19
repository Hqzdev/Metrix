import type { UpdateLocationInput, UpdateResourceInput } from '@metrix/contracts'
import { ValidationError } from './errors.js'

type JsonObject = Record<string, unknown>

/**
 * Валидирует и фильтрует поля, разрешённые для обновления локации.
 *
 * Системные поля намеренно игнорируются, чтобы caller не мог выполнить
 * mass assignment через id, resource ids или другие внутренние свойства.
 */
export function parseUpdateLocationInput(input: unknown): UpdateLocationInput {
  const body = requireObject(input)
  const safeBody: UpdateLocationInput = {}

  if (body.occupancy !== undefined) {
    safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  }

  if (body.members !== undefined) {
    safeBody.members = requireString(body.members, 'members')
  }

  return requireAtLeastOneField(safeBody)
}

/**
 * Валидирует и фильтрует поля, разрешённые для обновления ресурса.
 */
export function parseUpdateResourceInput(input: unknown): UpdateResourceInput {
  const body = requireObject(input)
  const safeBody: UpdateResourceInput = {}

  if (body.priceLabel !== undefined) {
    safeBody.priceLabel = requireString(body.priceLabel, 'priceLabel')
  }

  if (body.priceMinorUnits !== undefined) {
    safeBody.priceMinorUnits = requirePositiveNumber(body.priceMinorUnits, 'priceMinorUnits')
  }

  if (body.occupancy !== undefined) {
    safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  }

  if (body.status !== undefined) {
    safeBody.status = requireString(body.status, 'status')
  }

  return requireAtLeastOneField(safeBody)
}

/**
 * Извлекает непустой id из route path prefix.
 */
export function readIdFromPath(path: string, prefix: string, suffix = ''): string {
  if (!path.startsWith(prefix) || (suffix && !path.endsWith(suffix))) {
    throw new ValidationError('invalid path')
  }

  const id = path.slice(prefix.length, suffix ? path.length - suffix.length : undefined)
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
    throw new ValidationError(`${fieldName} must be a non-empty string`)
  }

  return value
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
