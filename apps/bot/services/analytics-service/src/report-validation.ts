import { ValidationError } from './errors.js'

export type CreateReportInput = {
  requestedBy?: bigint
  type: string
}

/**
 * Валидирует payload создания отчёта.
 *
 * requestedBy опционален, потому что отчёт может быть создан автоматическим
 * internal caller без пользовательского контекста.
 */
export function parseCreateReportInput(input: unknown): CreateReportInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  const body = input as Record<string, unknown>
  if (typeof body.type !== 'string' || body.type.trim() === '') {
    throw new ValidationError('type required')
  }

  return {
    requestedBy: parseOptionalUserId(body.requestedBy),
    type: body.type,
  }
}

/**
 * Извлекает непустой id из route path prefix.
 */
export function readIdFromPath(path: string, prefix: string): string {
  const id = path.slice(prefix.length)
  if (id.trim() === '') {
    throw new ValidationError('id is required')
  }

  return id
}

/**
 * Парсит строковое значение в валидный идентификатор.
 */
function parseOptionalUserId(value: unknown): bigint | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const userId = Number(value)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('requestedBy must be a positive integer')
  }

  return BigInt(userId)
}
