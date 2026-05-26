import type { UpdateLocationInput, UpdateResourceInput } from '@metrix/contracts'
import { ValidationError } from './errors.js'

// Удобное имя для обычного JSON-объекта без массивов.
type JsonObject = Record<string, unknown>

/**
 * Валидирует и фильтрует поля, разрешённые для обновления локации.
 *
 * Системные поля намеренно игнорируются, чтобы caller не мог выполнить
 * mass assignment через id, resource ids или другие внутренние свойства.
 */
export function parseUpdateLocationInput(input: unknown): UpdateLocationInput {
  // Сначала убеждаемся, что тело запроса является объектом.
  const body = requireObject(input)
  // safeBody собирает только те поля, которые разрешено менять администратору.
  const safeBody: UpdateLocationInput = {}

  // occupancy — человекочитаемая вместимость/загрузка локации.
  if (body.occupancy !== undefined) {
    safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  }
 
  // members — описание участников или доступности для локации.
  if (body.members !== undefined) {
    safeBody.members = requireString(body.members, 'members')
  }

  // Нельзя отправлять пустой PATCH без полезных полей.
  return requireAtLeastOneField(safeBody)
}

/**
 * Валидирует и фильтрует поля, разрешённые для обновления ресурса.
 */
export function parseUpdateResourceInput(input: unknown): UpdateResourceInput {
  // Сначала требуем объект, иначе дальше нельзя безопасно читать поля.
  const body = requireObject(input)
  // В итоговый payload попадут только явно разрешённые поля.
  const safeBody: UpdateResourceInput = {}

  // priceLabel — строка для отображения цены пользователю.
  if (body.priceLabel !== undefined) {
    safeBody.priceLabel = requireString(body.priceLabel, 'priceLabel')
  }

  // priceMinorUnits — цена в минимальных единицах валюты, например в копейках.
  if (body.priceMinorUnits !== undefined) {
    safeBody.priceMinorUnits = requirePositiveNumber(body.priceMinorUnits, 'priceMinorUnits')
  }

  // occupancy описывает вместимость или занятость ресурса.
  if (body.occupancy !== undefined) {
    safeBody.occupancy = requireString(body.occupancy, 'occupancy')
  }

  // status хранит состояние ресурса, например активен он или нет.
  if (body.status !== undefined) {
    safeBody.status = requireString(body.status, 'status')
  }

  // Если ни одно разрешённое поле не пришло, обновлять нечего.
  return requireAtLeastOneField(safeBody)
}

// Валидированный payload для ручного replay DLQ-сообщения.
export type ReplayDlqInput = {
  // Имя Redis stream-а DLQ, откуда берём сообщение.
  dlqStream: string
  // Id конкретного сообщения в DLQ stream-е.
  messageId: string
  // Явно указанный целевой stream; если не задан, используется originalStream из сообщения.
  targetStream?: string
}

/**
 * Валидирует тело запроса POST /dlq/replay.
 *
 * dlqStream и messageId обязательны — без них невозможно найти нужное сообщение.
 * targetStream опционален: если не указан, replay идёт в originalStream из сообщения.
 *
 * Следует тому же паттерну, что parseUpdateLocationInput и parseUpdateResourceInput:
 * сначала требуем объект, затем валидируем каждое поле отдельно.
 */
export function parseReplayDlqInput(input: unknown): ReplayDlqInput {
  // Сначала убеждаемся, что тело является объектом, а не примитивом или массивом.
  const body = requireObject(input)

  // dlqStream обязателен: именно из этого stream-а мы читаем сообщение.
  const dlqStream = requireString(body.dlqStream, 'dlqStream')

  // messageId обязателен: без него нельзя найти конкретное сообщение в stream-е.
  const messageId = requireString(body.messageId, 'messageId')

  // targetStream опционален: позволяет перенаправить replay в другой stream.
  // Если поле есть, оно должно быть непустой строкой.
  const targetStream =
    body.targetStream !== undefined ? requireString(body.targetStream, 'targetStream') : undefined

  return { dlqStream, messageId, targetStream }
}

/**
 * Извлекает непустой id из route path prefix.
 */
export function readIdFromPath(path: string, prefix: string, suffix = ''): string {
  // Проверяем, что путь соответствует ожидаемому шаблону endpoint-а.
  if (!path.startsWith(prefix) || (suffix && !path.endsWith(suffix))) {
    throw new ValidationError('invalid path')
  }

  // Вырезаем id между prefix и optional suffix.
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
  // null и массивы в JavaScript тоже считаются object, поэтому проверяем их отдельно.
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  return input as JsonObject
}

/**
 * Гарантирует, что поле передано непустой строкой.
 */
function requireString(value: unknown, fieldName: string): string {
  // Пустые строки не принимаем, потому что они обычно ломают отображение в интерфейсе.
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`)
  }

  return value
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
 * Проверяет, что после фильтрации осталось хотя бы одно поле для обновления.
 */
function requireAtLeastOneField<T extends Record<string, unknown>>(value: T): T {
  // Object.keys показывает, сколько разрешённых полей реально попало в payload.
  if (Object.keys(value).length === 0) {
    throw new ValidationError('no valid fields to update')
  }

  return value
}
