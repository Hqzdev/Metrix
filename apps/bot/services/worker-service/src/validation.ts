import type { CalendarRefreshJobData, CompletionJobData, ReminderJobData, ReportJobData } from './queues.js'

/**
 * Валидирует данные reminder job из BullMQ.
 */
export function parseReminderJobData(input: unknown): ReminderJobData {
  const data = requireObject(input)
  const language = requireString(data.language, 'language')
  if (language !== 'en' && language !== 'ru') {
    throw new Error('language must be en or ru')
  }

  return {
    bookingId: requireString(data.bookingId, 'bookingId'),
    chatId: requireInteger(data.chatId, 'chatId'),
    language,
    locationName: requireString(data.locationName, 'locationName'),
    resourceName: requireString(data.resourceName, 'resourceName'),
    startsAt: requireString(data.startsAt, 'startsAt'),
    startsAtIso: requireString(data.startsAtIso, 'startsAtIso'),
    telegramUserId: requirePositiveInteger(data.telegramUserId, 'telegramUserId'),
  }
}

/**
 * Валидирует данные completion job из BullMQ.
 */
export function parseCompletionJobData(input: unknown): CompletionJobData {
  const data = requireObject(input)

  return {
    bookingId: requireString(data.bookingId, 'bookingId'),
    telegramUserId: requirePositiveInteger(data.telegramUserId, 'telegramUserId'),
  }
}

/**
 * Валидирует данные calendar refresh job из BullMQ.
 */
export function parseCalendarRefreshJobData(input: unknown): CalendarRefreshJobData {
  const data = requireObject(input)
  const provider = requireString(data.provider, 'provider')
  if (provider !== 'google' && provider !== 'microsoft') {
    throw new Error('provider must be google or microsoft')
  }

  return {
    connectionId: requireString(data.connectionId, 'connectionId'),
    provider,
    telegramUserId: requirePositiveInteger(data.telegramUserId, 'telegramUserId'),
  }
}

/**
 * Валидирует данные report job из BullMQ.
 */
export function parseReportJobData(input: unknown): ReportJobData {
  const data = requireObject(input)
  const dateFrom = readOptionalDateString(data.dateFrom, 'dateFrom')
  const dateTo = readOptionalDateString(data.dateTo, 'dateTo')

  return {
    chatId: requireInteger(data.chatId, 'chatId'),
    dateFrom,
    dateTo,
    reportId: requireString(data.reportId, 'reportId'),
    requestedBy: requirePositiveInteger(data.requestedBy, 'requestedBy'),
    type: requireString(data.type, 'type'),
  }
}

/**
 * Гарантирует, что входное значение является JSON-объектом.
 */
function requireObject(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('job data must be an object')
  }

  return input as Record<string, unknown>
}

/**
 * Читает обязательную непустую строку.
 */
function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string`)
  }

  return value
}

/**
 * Читает целое число.
 */
function requireInteger(value: unknown, fieldName: string): number {
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${fieldName} must be an integer`)
  }

  return numberValue
}

/**
 * Читает положительное целое число.
 */
function requirePositiveInteger(value: unknown, fieldName: string): number {
  const numberValue = requireInteger(value, fieldName)
  if (numberValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`)
  }

  return numberValue
}

/**
 * Читает optional ISO date string и отбрасывает невалидные даты.
 */
function readOptionalDateString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const dateString = requireString(value, fieldName)
  if (Number.isNaN(new Date(dateString).getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return dateString
}
