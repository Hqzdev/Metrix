import type {
  CancelBookingRequest,
  CreateBookingRequest,
  RescheduleBookingRequest,
} from '../../contracts/bookings.js'
import {
  optionalIsoDateField,
  optionalNumberField,
  optionalStringField,
  stringField,
  validateObject,
  type ValidationResult,
} from '../../shared/validation/validator.js'

// валидирует вход для создания брони
export function validateCreateBookingRequest(input: unknown): ValidationResult<CreateBookingRequest> {
  return validateObject<CreateBookingRequest>(input, {
    endsAt: optionalIsoDateField,
    resourceId: stringField,
    slotId: optionalStringField,
    startsAt: optionalIsoDateField,
    telegramUserId: optionalNumberField,
    userId: optionalStringField,
  })
}

// валидирует вход для отмены брони
export function validateCancelBookingRequest(input: unknown): ValidationResult<CancelBookingRequest> {
  return validateObject<CancelBookingRequest>(input, {
    bookingId: stringField,
    telegramUserId: optionalNumberField,
    userId: optionalStringField,
  })
}

// валидирует вход для переноса брони
export function validateRescheduleBookingRequest(input: unknown): ValidationResult<RescheduleBookingRequest> {
  return validateObject<RescheduleBookingRequest>(input, {
    bookingId: stringField,
    newSlotId: stringField,
    telegramUserId: optionalNumberField,
    userId: optionalStringField,
  })
}
