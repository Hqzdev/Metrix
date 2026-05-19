import type { UpdateLocationRequest, UpdateResourceRequest } from '../../contracts/resources.js'
import {
  optionalNumberField,
  optionalStringField,
  validateObject,
  type ValidationResult,
} from '../../shared/validation/validator.js'

/**
 * Валидирует и фильтрует поля запроса на изменение локации.
 *
 * Системные поля (id, resourceIds и др.) намеренно не включены в shape —
 * admin не может выполнить mass assignment через этот эндпоинт.
 */
export function validateUpdateLocationRequest(input: unknown): ValidationResult<UpdateLocationRequest> {
  return validateObject<UpdateLocationRequest>(input, {
    members: optionalStringField,
    occupancy: optionalStringField,
  })
}

/**
 * Валидирует и фильтрует поля запроса на изменение ресурса.
 *
 * Системные поля (id, locationId и др.) намеренно не включены в shape.
 */
export function validateUpdateResourceRequest(input: unknown): ValidationResult<UpdateResourceRequest> {
  return validateObject<UpdateResourceRequest>(input, {
    occupancy: optionalStringField,
    priceLabel: optionalStringField,
    priceMinorUnits: optionalNumberField,
    status: optionalStringField,
  })
}
