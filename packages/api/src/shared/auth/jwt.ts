import { createHmac, timingSafeEqual } from 'node:crypto'

// внутренние поля JWT payload
type JwtPayload = {
  exp: number
  kid: string
  role: 'admin' | 'employee'
  sub: string
}

// один ключ в наборе: идентификатор + секрет
export type JwtKey = {
  id: string
  secret: string
}

/**
 * Набор ключей для подписи и проверки JWT.
 *
 * current — ключ, которым подписываются новые токены.
 * previous — старые ключи, которые ещё принимаются при проверке.
 *
 * Это позволяет ротировать секрет плавно:
 * 1. Добавить новый ключ в current, старый переместить в previous.
 * 2. Все новые токены подписываются новым ключом.
 * 3. Токены со старым ключом продолжают работать до истечения срока жизни.
 * 4. Через 15 минут (TTL access token) убрать старый ключ из previous.
 */
export type JwtSecrets = {
  current: JwtKey
  previous?: JwtKey[]
}

export type VerifyJwtResult =
  | { status: 'ok'; payload: JwtPayload }
  | { status: 'error'; message: string }

/**
 * Создаёт подписанный JWT для API-сессии.
 *
 * В header записывается kid — идентификатор ключа, которым подписан токен.
 * При проверке kid позволяет выбрать нужный ключ из набора JwtSecrets,
 * не перебирая все ключи подряд.
 *
 * важно:
 * - используется HS256 — симметричная подпись достаточна для внутреннего API.
 * - для подписи всегда берётся secrets.current.
 */
export function createJwt(input: {
  expiresInSeconds: number
  role: 'admin' | 'employee'
  secrets: JwtSecrets
  userId: string
}): string {
  // kid записывается в header, чтобы verifyJwt мог найти нужный ключ
  const header = encode({ alg: 'HS256', kid: input.secrets.current.id, typ: 'JWT' })
  const payload = encode({
    exp: Math.floor(Date.now() / 1000) + input.expiresInSeconds,
    kid: input.secrets.current.id,
    role: input.role,
    sub: input.userId,
  })
  const signature = sign(`${header}.${payload}`, input.secrets.current.secret)

  return `${header}.${payload}.${signature}`
}

/**
 * Верифицирует JWT и проверяет срок жизни.
 *
 * важно:
 * - kid из header определяет, каким ключом проверяется подпись.
 *   Если ключ с таким kid не найден — токен отклоняется.
 * - подпись проверяется через timingSafeEqual — защита от timing attack.
 * - разная длина буферов обрабатывается отдельно: timingSafeEqual
 *   требует одинаковую длину, иначе паникует в runtime.
 */
export function verifyJwt(token: string, secrets: JwtSecrets): VerifyJwtResult {
  const parts = token.split('.')

  if (parts.length !== 3) {
    return { status: 'error', message: 'invalid token format' }
  }

  const [rawHeader, rawPayload, signature] = parts as [string, string, string]

  // читаем kid из header без полной проверки подписи
  const kidResult = extractKidFromHeader(rawHeader)
  if (kidResult.status === 'error') {
    return kidResult
  }

  // находим ключ по kid — current или один из previous
  const key = findKeyById(secrets, kidResult.kid)
  if (!key) {
    return { status: 'error', message: 'unknown key id' }
  }

  // теперь проверяем подпись найденным ключом
  const expectedSignature = sign(`${rawHeader}.${rawPayload}`, key.secret)
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
 * Читает и декодирует kid из base64url-encoded JWT header.
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
 * Ищет ключ по id в current и previous.
 *
 * Возвращает null, если ключ с таким id не найден —
 * это означает, что токен подписан неизвестным ключом.
 */
function findKeyById(secrets: JwtSecrets, kid: string): JwtKey | null {
  if (secrets.current.id === kid) return secrets.current

  return secrets.previous?.find((k) => k.id === kid) ?? null
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
