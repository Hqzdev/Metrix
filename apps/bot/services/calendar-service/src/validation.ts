import { ValidationError } from './errors.js'

// Обычный JSON-объект: не null и не массив.
type JsonObject = Record<string, unknown>

// Payload POST /auth-url.
export type BuildAuthUrlInput = {
  provider: 'google'
  resourceId?: string
  scope: string
  telegramUserId: number
}

// Payload POST /oauth-callback.
export type OAuthCallbackInput = {
  code: string
  state: string
}

// Payload POST /refresh-token.
export type RefreshTokenInput = {
  provider: string
  scope: string
  telegramUserId: number
}

// Payload DELETE /connections.
export type DeleteConnectionInput = {
  provider: string
  telegramUserId: number
}

/**
 * Валидирует payload создания Google OAuth URL.
 *
 * user id может прийти из подписанного заголовка или из body, поэтому
 * callerUserId передаётся отдельно и имеет приоритет.
 */
export function parseBuildAuthUrlInput(input: unknown, callerUserId: number | undefined): BuildAuthUrlInput {
  // Тело должно быть объектом, иначе поля читать небезопасно.
  const body = requireObject(input)
  const provider = requireProvider(body.provider)

  return {
    provider,
    resourceId: optionalString(body.resourceId, 'resourceId'),
    scope: optionalString(body.scope, 'scope') ?? 'user',
    telegramUserId: resolveUserId(callerUserId, body.telegramUserId),
  }
}

/**
 * Валидирует payload OAuth callback от bot-gateway.
 */
export function parseOAuthCallbackInput(input: unknown): OAuthCallbackInput {
  // Google callback должен прийти JSON-объектом от gateway.
  const body = requireObject(input)

  return {
    code: requireString(body.code, 'code'),
    state: requireString(body.state, 'state'),
  }
}

/**
 * Валидирует payload обновления access token.
 */
export function parseRefreshTokenInput(input: unknown, callerUserId: number | undefined): RefreshTokenInput {
  // Refresh token обновляется для конкретного provider/user/scope.
  const body = requireObject(input)

  return {
    provider: requireString(body.provider, 'provider'),
    scope: optionalString(body.scope, 'scope') ?? 'user',
    telegramUserId: resolveUserId(callerUserId, body.telegramUserId),
  }
}

/**
 * Валидирует payload отключения календаря.
 */
export function parseDeleteConnectionInput(input: unknown, callerUserId: number | undefined): DeleteConnectionInput {
  // Удаление требует provider и владельца подключения.
  const body = requireObject(input)

  return {
    provider: requireString(body.provider, 'provider'),
    telegramUserId: resolveUserId(callerUserId, body.telegramUserId),
  }
}

/**
 * Выбирает доверенный user id из подписи или payload.
 */
export function resolveUserId(callerUserId: number | undefined, rawValue: unknown): number {
  // Подписанный callerUserId важнее значения из payload/query.
  const userId = callerUserId ?? Number(rawValue)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('telegramUserId is required and must be a positive integer')
  }

  return userId
}

/**
 * Гарантирует, что входное значение является JSON-объектом.
 */
function requireObject(input: unknown): JsonObject {
  // null и массивы в JavaScript тоже считаются object, поэтому проверяем их отдельно.
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be an object')
  }

  return input as JsonObject
}

/**
 * Гарантирует, что поле передано непустой строкой.
 */
function requireString(value: unknown, fieldName: string): string {
  // Пустые строки не несут полезного значения для OAuth payload.
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`)
  }

  return value
}

/**
 * Возвращает optional строку только если поле заполнено.
 */
function optionalString(value: unknown, fieldName: string): string | undefined {
  // Отсутствующее поле остаётся undefined.
  if (value === undefined || value === null) return undefined
  return requireString(value, fieldName)
}

/**
 * Проверяет, что provider сейчас поддерживается calendar-service.
 */
function requireProvider(value: unknown): 'google' {
  // Сейчас реализован только Google Calendar.
  if (value !== 'google') {
    throw new ValidationError('provider must be google')
  }

  return value
}
