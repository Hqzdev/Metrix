import type { PaymentCompletedEvent } from '@metrix/contracts'
import { NotFoundError, ValidationError } from './errors.js'

// Обычный JSON-объект: не null и не массив.
type JsonObject = Record<string, unknown>

// Telegram pre_checkout_query в упрощённом виде.
export type PreCheckoutQuery = {
  currency: string
  from: { id: number }
  id: string
  invoice_payload: string
  total_amount: number
}

// Telegram message с successful_payment.
export type SuccessfulPaymentMessage = {
  chat: { id: number }
  from?: { id: number }
  successful_payment: { invoice_payload: string; total_amount: number }
}

// Payload создания invoice.
export type CreateInvoiceInput = {
  chatId: number
  resourceId: string
  slotId: string
  telegramUserId: number
}

/**
 * Валидирует payload создания invoice.
 */
export function parseCreateInvoiceInput(input: unknown, callerUserId: number | undefined): CreateInvoiceInput {
  const body = requireObject(input)

  return {
    chatId: requireInteger(body.chatId, 'chatId'),
    resourceId: requireString(body.resourceId, 'resourceId'),
    slotId: requireString(body.slotId, 'slotId'),
    telegramUserId: resolveUserId(callerUserId, body.telegramUserId),
  }
}

/**
 * Валидирует Telegram pre_checkout_query payload.
 */
export function parsePreCheckoutQuery(input: unknown): PreCheckoutQuery | null {
  const body = requireObject(input)
  if (body.query === undefined || body.query === null) return null

  const query = requireObject(body.query)
  const from = requireObject(query.from)

  return {
    currency: requireString(query.currency, 'query.currency'),
    from: { id: requirePositiveInteger(from.id, 'query.from.id') },
    id: requireString(query.id, 'query.id'),
    invoice_payload: requireString(query.invoice_payload, 'query.invoice_payload'),
    total_amount: requirePositiveInteger(query.total_amount, 'query.total_amount'),
  }
}

/**
 * Валидирует Telegram successful_payment payload.
 */
export function parseSuccessfulPaymentMessage(input: unknown): SuccessfulPaymentMessage | null {
  const body = requireObject(input)
  if (body.message === undefined || body.message === null) return null

  const message = requireObject(body.message)
  const chat = requireObject(message.chat)
  const successfulPayment = requireObject(message.successful_payment)
  const rawFrom = message.from === undefined || message.from === null ? undefined : requireObject(message.from)

  return {
    chat: { id: requireInteger(chat.id, 'message.chat.id') },
    from: rawFrom ? { id: requirePositiveInteger(rawFrom.id, 'message.from.id') } : undefined,
    successful_payment: {
      invoice_payload: requireString(successfulPayment.invoice_payload, 'message.successful_payment.invoice_payload'),
      total_amount: requirePositiveInteger(successfulPayment.total_amount, 'message.successful_payment.total_amount'),
    },
  }
}

/**
 * Валидирует событие PAYMENT_COMPLETED на входе Redis consumer-а.
 */
export function parsePaymentCompletedEvent(input: unknown): PaymentCompletedEvent {
  const event = requireObject(input)

  return {
    chatId: requireInteger(event.chatId, 'chatId'),
    invoiceId: requireString(event.invoiceId, 'invoiceId'),
    resourceId: requireString(event.resourceId, 'resourceId'),
    slotId: requireString(event.slotId, 'slotId'),
    telegramUserId: requirePositiveInteger(event.telegramUserId, 'telegramUserId'),
    totalAmountMinorUnits: requirePositiveInteger(event.totalAmountMinorUnits, 'totalAmountMinorUnits'),
  }
}

/**
 * Достаёт id из пути с заданным prefix и suffix.
 */
export function readIdFromPath(path: string, prefix: string, suffix: string): string {
  // Если путь не похож на ожидаемый route, возвращаем 404.
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
    throw new NotFoundError()
  }

  // Вырезаем часть между prefix и suffix.
  const id = path.slice(prefix.length, path.length - suffix.length)
  if (id.trim() === '') {
    throw new ValidationError('id is required')
  }

  return id
}

/**
 * Выбирает доверенный user id из подписи или payload.
 */
function resolveUserId(callerUserId: number | undefined, rawValue: unknown): number {
  // Подписанный callerUserId важнее значения из body.
  const userId = callerUserId ?? Number(rawValue)
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('telegramUserId is required and must be a positive integer')
  }

  return userId
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
 * Читает обязательную непустую строку.
 */
function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} is required`)
  }

  return value
}

/**
 * Читает целое число.
 */
function requireInteger(value: unknown, fieldName: string): number {
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue)) {
    throw new ValidationError(`${fieldName} must be an integer`)
  }

  return numberValue
}

/**
 * Читает положительное целое число.
 */
function requirePositiveInteger(value: unknown, fieldName: string): number {
  const numberValue = requireInteger(value, fieldName)
  if (numberValue <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`)
  }

  return numberValue
}
