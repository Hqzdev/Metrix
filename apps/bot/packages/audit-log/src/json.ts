import type { JsonSafeValue } from './types.js'

/**
 * Приводит payload к JSON-safe объекту.
 */
export function toJsonObject(value: Record<string, unknown>): Record<string, JsonSafeValue> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
}

/**
 * Приводит одно значение к виду, который можно сохранить в JSON колонку.
 */
function toJsonValue(value: unknown): JsonSafeValue {
  // BigInt напрямую не сериализуется в JSON.
  if (typeof value === 'bigint') return value.toString()
  // Date сохраняем как ISO-строку.
  if (value instanceof Date) return value.toISOString()
  // Массивы обрабатываем рекурсивно.
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (value && typeof value === 'object') {
    // Вложенные объекты тоже приводим рекурсивно.
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) return value

  return String(value)
}
