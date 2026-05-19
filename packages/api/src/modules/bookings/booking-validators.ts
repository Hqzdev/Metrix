import type {
  CancelBookingRequest,
  CreateBookingRequest,
  RescheduleBookingRequest,
} from '../../contracts/bookings.js'
import {
  optionalIsoDateField,
  optionalPositiveIntegerField,
  optionalStringField,
  stringField,
  validateObject,
  type ValidationResult,
} from '../../shared/validation/validator.js'

/**
 * Валидирует запрос на создание бронирования.
 *
 * telegramUserId и userId взаимоисключающи по смыслу, но оба опциональны —
 * сервис поддерживает создание брони как из Telegram-бота, так и из веб-интерфейса.
 */
export function validateCreateBookingRequest(input: unknown): ValidationResult<CreateBookingRequest> {
  return validateObject<CreateBookingRequest>(input, {
    endsAt: optionalIsoDateField,
    resourceId: stringField,
    slotId: optionalStringField,
    startsAt: optionalIsoDateField,
    telegramUserId: optionalPositiveIntegerField,
    userId: optionalStringField,
  })
}

/**
 * Валидирует запрос на отмену бронирования.
 */
export function validateCancelBookingRequest(input: unknown): ValidationResult<CancelBookingRequest> {
  return validateObject<CancelBookingRequest>(input, {
    bookingId: stringField,
    telegramUserId: optionalPositiveIntegerField,
    userId: optionalStringField,
  })
}

/**
 * Валидирует запрос на перенос бронирования на другой слот.
 */
export function validateRescheduleBookingRequest(input: unknown): ValidationResult<RescheduleBookingRequest> {
  return validateObject<RescheduleBookingRequest>(input, {
    bookingId: stringField,
    newSlotId: stringField,
    telegramUserId: optionalPositiveIntegerField,
    userId: optionalStringField,
  })
}
