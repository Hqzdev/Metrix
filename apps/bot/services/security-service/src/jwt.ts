import { createHmac, timingSafeEqual } from 'node:crypto'
import type { JwtKeysConfig } from './config.js'

// поля внутри JWT payload
type JwtPayload = {
  exp: number
  kid: string
  role: 'admin' | 'employee'
  sub: string
}

/**
 * Результат верификации JWT.
 *
 * ok — подпись верна, токен не истёк, payload доступен.
 * error — что-то не так, message объясняет причину (для логов, не для клиента).
 */
export type VerifyJwtResult =
  | { status: 'ok'; payload: JwtPayload }
  | { status: 'error'; message: string }

/**
 * Создаёт подписанный JWT для пользовательской сессии.
 *
 * важно:
 * - kid записывается в header — при верификации им выбирается правильный ключ.
 * - для подписи всегда берётся current-ключ из конфига.
 * - используется HS256 — симметричная подпись достаточна, верификатор и эмитент один сервис.
 */
export function createJwt(input: {
  expiresInSeconds: number
  keys: JwtKeysConfig
  role: 'admin' | 'employee'
  userId: string
}): string {
  // kid в header позволяет при проверке сразу выбрать нужный ключ
  const header = encode({ alg: 'HS256', kid: input.keys.currentId, typ: 'JWT' })
  const payload = encode({
    exp: Math.floor(Date.now() / 1000) + input.expiresInSeconds,
    kid: input.keys.currentId,
    role: input.role,
    sub: input.userId,
  })
  const signature = sign(`${header}.${payload}`, input.keys.currentSecret)

  return `${header}.${payload}.${signature}`
}

/**
 * Верифицирует JWT, проверяет подпись и срок жизни.
 *
 * важно:
 * - kid из header определяет, каким ключом проверяется подпись.
 *   Если ключ с таким kid не найден в конфиге — токен отклоняется.
 * - подпись проверяется через timingSafeEqual — защита от timing attack.
 * - разная длина буферов проверяется отдельно: timingSafeEqual требует одинаковую длину.
 */
export function verifyJwt(token: string, keys: JwtKeysConfig): VerifyJwtResult {
  const parts = token.split('.')

  if (parts.length !== 3) {
    return { status: 'error', message: 'invalid token format' }
  }

  const [rawHeader, rawPayload, signature] = parts as [string, string, string]

  // читаем kid из header до проверки подписи — он определяет, какой ключ использовать
  const kidResult = extractKidFromHeader(rawHeader)
  if (kidResult.status === 'error') {
    return kidResult
  }

  // ищем ключ по kid — сначала current, потом previous (для токенов выпущенных до ротации)
  const secret = findSecretByKid(keys, kidResult.kid)
  if (!secret) {
    return { status: 'error', message: 'unknown key id' }
  }

  const expectedSignature = sign(`${rawHeader}.${rawPayload}`, secret)
  if (!safeEqual(signature, expectedSignature)) {
    return { status: 'error', message: 'invalid token signature' }
  }

  const parsed = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8')) as JwtPayload

  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return { status: 'error', message: 'token expired' }
  }

  return { status: 'ok', payload: parsed }
}

/**
 * Читает kid из base64url-encoded JWT header без проверки подписи.
 *
 * Делается до проверки подписи, чтобы выбрать нужный ключ.
 * Если header сломан или kid отсутствует — возвращаем ошибку.
 */
function extractKidFromHeader(
  rawHeader: string,
): { status: 'ok'; kid: string } | { status: 'error'; message: string } {
  try {
    const decoded = JSON.parse(Buffer.from(rawHeader, 'base64url').toString('utf8')) as Record<string, unknown>

    if (typeof decoded.kid !== 'string' || decoded.kid.trim() === '') {
      return { status: 'error', message: 'missing kid in token header' }
    }

    return { status: 'ok', kid: decoded.kid }
  } catch {
    return { status: 'error', message: 'malformed token header' }
  }
}

/**
 * Ищет секрет по kid — сначала в current, потом в previous.
 *
 * Возвращает null если ключ не найден — токен подписан неизвестным ключом.
 */
function findSecretByKid(keys: JwtKeysConfig, kid: string): string | null {
  if (keys.currentId === kid) return keys.currentSecret

  const prev = keys.previous.find((k) => k.id === kid)
  return prev?.secret ?? null
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  // timingSafeEqual требует одинаковую длину — проверяем сначала
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
