import type { NotificationSendEvent } from '@metrix/contracts'
import { NotificationValidationError } from './errors.js'

/**
 * Проверяет payload Redis stream и возвращает типизированное событие уведомления.
 */
export function parseNotificationSendEvent(input: unknown): NotificationSendEvent {
  const event = readRecord(input, 'notification event')
  const type = readString(event.type, 'type')

  if (type === 'send_message') {
    return {
      type,
      chatId: readNumber(event.chatId, 'chatId'),
      text: readString(event.text, 'text'),
      replyMarkup: event.replyMarkup,
    }
  }

  if (type === 'edit_message') {
    return {
      type,
      chatId: readNumber(event.chatId, 'chatId'),
      messageId: readNumber(event.messageId, 'messageId'),
      text: readString(event.text, 'text'),
      replyMarkup: event.replyMarkup,
    }
  }
 
  if (type === 'send_invoice') {
    return {
      type,
      amount: readNumber(event.amount, 'amount'),
      chatId: readNumber(event.chatId, 'chatId'),
      currency: readString(event.currency, 'currency'),
      description: readString(event.description, 'description'),
      invoiceId: readString(event.invoiceId, 'invoiceId'),
      payload: readString(event.payload, 'payload'),
      providerToken: readString(event.providerToken, 'providerToken'),
      title: readString(event.title, 'title'),
    }
  }

  if (type === 'send_document') {
    return {
      type,
      caption: readOptionalString(event.caption, 'caption'),
      chatId: readNumber(event.chatId, 'chatId'),
      filePath: readString(event.filePath, 'filePath'),
    }
  }

  throw new NotificationValidationError(`Unsupported notification event type: ${type}`)
}

/**
 * Проверяет, что значение является объектом с полями.
 */
function readRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new NotificationValidationError(`${fieldName} must be an object`)
  }

  return value as Record<string, unknown>
}

/**
 * Читает обязательную строку из payload.
 */
function readString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new NotificationValidationError(`${fieldName} must be a non-empty string`)
  }

  return value
}

/**
 * Читает optional строку из payload.
 */
function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw new NotificationValidationError(`${fieldName} must be a string`)
  }

  return value
}

/**
 * Читает конечное число из payload.
 */
function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new NotificationValidationError(`${fieldName} must be a finite number`)
  }

  return value
}
