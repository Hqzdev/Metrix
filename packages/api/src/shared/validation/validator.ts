export type ValidationResult<TData> =
  | { status: 'ok'; data: TData }
  | { status: 'error'; message: string }

export type ObjectShape<TData> = {
  [TKey in keyof TData]: FieldValidator<TData[TKey]>
}

export type FieldValidator<TValue> = (value: unknown, field: string) => ValidationResult<TValue>

// валидирует объект по описанию полей
export function validateObject<TData>(value: unknown, shape: ObjectShape<TData>): ValidationResult<TData> {
  if (!isRecord(value)) {
    return { status: 'error', message: 'input should be an object' }
  }

  const data: Record<string, unknown> = {}
  for (const [field, validator] of Object.entries(shape)) {
    const result = (validator as FieldValidator<unknown>)(value[field], field)
    if (result.status === 'error') {
      return result
    }
    data[field] = result.data
  }

  return { status: 'ok', data: data as TData }
}

// проверяет обязательную строку
export function stringField(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { status: 'error', message: `${field} should be a non-empty string` }
  }

  return { status: 'ok', data: value.trim() }
}

// проверяет необязательную строку
export function optionalStringField(value: unknown, field: string): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { status: 'ok', data: undefined }
  }

  return stringField(value, field)
}

// проверяет необязательное число
export function optionalNumberField(value: unknown, field: string): ValidationResult<number | undefined> {
  if (value === undefined || value === null || value === '') {
    return { status: 'ok', data: undefined }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { status: 'error', message: `${field} should be a number` }
  }

  return { status: 'ok', data: value }
}

// проверяет iso дату
export function optionalIsoDateField(value: unknown, field: string): ValidationResult<string | undefined> {
  const result = optionalStringField(value, field)
  if (result.status === 'error' || !result.data) {
    return result
  }

  if (Number.isNaN(new Date(result.data).getTime())) {
    return { status: 'error', message: `${field} should be an ISO date` }
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
