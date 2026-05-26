import { ValidationError } from './errors.js'

// Обычный JSON-объект: не null и не массив.
type JsonObject = Record<string, unknown>

// Роли, которые security-service разрешает записывать в сессию.
const USER_ROLES = ['admin', 'employee'] as const

export type CreateSessionInput = {
  userId: string
  userRole: (typeof USER_ROLES)[number]
}

export type RotateSessionInput = {
  refreshToken: string
}

export type DeleteSessionInput = {
  accessToken?: string
  refreshToken: string
}

export type DeleteAllSessionsInput = {
  userId: string
}

export type TokenInput = {
  token: string
}

export type LoginIdentifierInput = {
  identifier: string
}

/**
 * Валидирует payload создания пользовательской сессии.
 */
export function parseCreateSessionInput(input: unknown): CreateSessionInput {
  const body = requireObject(input)
  const userRole = requireString(body.userRole, 'userRole')

  if (!USER_ROLES.includes(userRole as CreateSessionInput['userRole'])) {
    throw new ValidationError('userRole must be admin or employee')
  }

  return {
    userId: requireString(body.userId, 'userId'),
    userRole: userRole as CreateSessionInput['userRole'],
  }
}

/**
 * Валидирует payload ротации refresh token.
 */
export function parseRotateSessionInput(input: unknown): RotateSessionInput {
  const body = requireObject(input)
  return { refreshToken: requireString(body.refreshToken, 'refreshToken') }
}

/**
 * Валидирует payload logout-а одной сессии.
 */
export function parseDeleteSessionInput(input: unknown): DeleteSessionInput {
  const body = requireObject(input)
  return {
    accessToken: readOptionalString(body.accessToken, 'accessToken'),
    refreshToken: requireString(body.refreshToken, 'refreshToken'),
  }
}

/**
 * Валидирует payload удаления всех сессий пользователя.
 */
export function parseDeleteAllSessionsInput(input: unknown): DeleteAllSessionsInput {
  const body = requireObject(input)
  return { userId: requireString(body.userId, 'userId') }
}

/**
 * Валидирует payload операций с access token.
 */
export function parseTokenInput(input: unknown): TokenInput {
  const body = requireObject(input)
  return { token: requireString(body.token, 'token') }
}

/**
 * Валидирует payload brute-force limiter операций.
 */
export function parseLoginIdentifierInput(input: unknown): LoginIdentifierInput {
  const body = requireObject(input)
  return { identifier: requireString(body.identifier, 'identifier') }
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
 * Читает optional строку, если caller её передал.
 */
function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }

  return value
}
