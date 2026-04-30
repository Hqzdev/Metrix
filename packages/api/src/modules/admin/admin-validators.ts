import type { UpdateLocationRequest, UpdateResourceRequest } from '../../contracts/resources.js'
import {
  optionalNumberField,
  optionalStringField,
  validateObject,
  type ValidationResult,
} from '../../shared/validation/validator.js'

// валидирует изменение локации админом
export function validateUpdateLocationRequest(input: unknown): ValidationResult<UpdateLocationRequest> {
  return validateObject<UpdateLocationRequest>(input, {
    members: optionalStringField,
    occupancy: optionalStringField,
  })
}

// валидирует изменение ресурса админом
export function validateUpdateResourceRequest(input: unknown): ValidationResult<UpdateResourceRequest> {
  return validateObject<UpdateResourceRequest>(input, {
    occupancy: optionalStringField,
    priceLabel: optionalStringField,
    priceMinorUnits: optionalNumberField,
    status: optionalStringField,
  })
}
