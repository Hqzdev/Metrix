import type { SerializedError } from './types.js'

/**
 * Превращает любое значение ошибки в JSON-safe объект.
 *
 * Обрабатывает три случая:
 *   1. Error instance — берём message, name, stack, рекурсивно обрабатываем cause.
 *   2. Объект — возвращаем как есть (уже JSON-safe).
 *   3. Всё остальное — превращаем в строку через String().
 */
export function serializeError(value: unknown): SerializedError | string | unknown {
  if (value instanceof Error) {
    const serialized: SerializedError = {
      message: value.message,
      name: value.name,
      stack: value.stack,
    }

    // Error.cause — стандарт ES2022 и Node.js 16.9+.
    const causeValue = (value as Error & { cause?: unknown }).cause
    if (causeValue !== undefined) {
      const serializedCause = serializeError(causeValue)
      // cause всегда сохраняем — помогает при цепочках ошибок.
      serialized.cause = serializedCause as SerializedError
    }

    return serialized
  }

  // Объекты возвращаем напрямую — JSON.stringify справится.
  if (typeof value === 'object' && value !== null) {
    return value
  }

  // Примитивы и undefined → строка, чтобы не потерять информацию.
  return String(value)
}
