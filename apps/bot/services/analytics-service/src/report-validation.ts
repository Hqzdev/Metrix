import { ValidationError } from './errors.js'

// Данные, нужные для создания report-записи.
export type CreateReportInput = {
  // Кто запросил отчёт, если есть пользовательский контекст.
  requestedBy?: bigint
  // Тип отчёта, например daily/weekly/custom.
  type: string
}

/**
 * Валидирует payload создания отчёта.
 *
 * requestedBy опционален, потому что отчёт может быть создан автоматическим
 * internal caller без пользовательского контекста.
 */
export function parseCreateReportInput(input: unknown): CreateReportInput {
  // Body должен быть JSON-объектом.
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  // После проверки можно безопасно обращаться к полям.
  const body = input as Record<string, unknown>
  // type обязателен, потому что без него worker не поймёт, какой отчёт делать.
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
  // id — это всё, что находится после prefix.
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
  // Отсутствие user id допустимо для внутренних автоматических запросов.
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  // Принимаем строку или число, но в итоге требуем положительное целое.
  const userId = Number(value)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('requestedBy must be a positive integer')
  }

  // В Prisma user id хранится как BigInt.
  return BigInt(userId)
}
