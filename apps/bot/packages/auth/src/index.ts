import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

// Максимальная разница времени между сервисами для подписанного запроса.
const MAX_DRIFT_MS = 30_000

// 64 KB достаточно для любого межсервисного JSON — защита от OOM при намеренно большом body.
const MAX_BODY_BYTES = 64 * 1024

// Доверенный caller: имя сервиса и один или несколько секретов.
export type TrustedCaller = { name: string; secret: string | string[] }

// Результат проверки service-to-service подписи.
export type VerifyResult =
  | { ok: true; callerName: string; requestId: string; traceparent: string }
  | { ok: false; error: string }

/**
 * Создаёт заголовки для подписанного межсервисного запроса.
 *
 * Подпись покрывает: METHOD, path, timestamp, request-id, sha256(body).
 */
export function buildAuthHeaders(
  method: string,
  path: string,
  body: string,
  serviceName: string,
  signingSecret: string,
): Record<string, string> {
  // Timestamp нужен, чтобы старую подпись нельзя было использовать бесконечно.
  const timestamp = Math.floor(Date.now() / 1000).toString()
  // requestId нужен для replay-защиты и логов.
  const requestId = randomUUID()
  // traceparent связывает запросы между сервисами.
  const traceparent = createTraceparent()
  // Подписываем не сам body, а его sha256 hash.
  const bodyHash = createHash('sha256').update(body).digest('hex')
  // Важно сохранять тот же порядок строк при проверке.
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = createHmac('sha256', signingSecret).update(message).digest('hex')
  return {
    'content-type': 'application/json',
    'x-service-name': serviceName,
    'x-timestamp': timestamp,
    'x-request-id': requestId,
    'x-signature': signature,
    traceparent,
  }
}

/**
 * Проверяет, что входящий запрос подписан доверенным сервисом.
 *
 * Вызывать нужно ПОСЛЕ чтения body, потому что rawBody нужен для hash.
 */
export function verifyServiceRequest(
  req: IncomingMessage,
  rawBody: string,
  trusted: TrustedCaller[],
): VerifyResult {
  // Достаём обязательные auth headers.
  const name = req.headers['x-service-name'] as string | undefined
  const timestamp = req.headers['x-timestamp'] as string | undefined
  const requestId = req.headers['x-request-id'] as string | undefined
  const signature = req.headers['x-signature'] as string | undefined

  // Если чего-то не хватает, запрос не считается доверенным.
  if (!name || !timestamp || !requestId || !signature) {
    return { ok: false, error: 'missing auth headers' }
  }

  // Защита от старых запросов и сильного clock skew.
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > MAX_DRIFT_MS) {
    return { ok: false, error: 'request expired or clock skew too large' }
  }

  // Проверяем, что caller есть в списке доверенных.
  const caller = trusted.find((c) => c.name === name)
  if (!caller) {
    return { ok: false, error: 'unauthorized' }
  }

  // В подпись входит method и path с query string.
  const method = (req.method ?? 'GET').toUpperCase()
  const url = new URL(req.url ?? '/', 'http://localhost')
  const urlPath = `${url.pathname}${url.search}`
  const bodyHash = createHash('sha256').update(rawBody).digest('hex')
  const message = [method, urlPath, timestamp, requestId, bodyHash].join('\n')
  // Массив secrets нужен для плавной ротации ключей.
  const secrets = Array.isArray(caller.secret) ? caller.secret : [caller.secret]
  const matched = secrets.some((secret) => signatureMatches(message, signature, secret))

  if (!matched) {
    return { ok: false, error: 'invalid signature' }
  }

  // Возвращаем callerName и requestId, чтобы сервис мог логировать/audit.
  return { ok: true, callerName: name, requestId, traceparent: readTraceparent(req) }
}

/**
 * Создаёт W3C traceparent header.
 */
export function createTraceparent(): string {
  const traceId = randomBytes(16).toString('hex')
  const spanId = randomBytes(8).toString('hex')
  return `00-${traceId}-${spanId}-01`
}

/**
 * Читает traceparent из запроса или создаёт новый.
 */
export function readTraceparent(req: IncomingMessage): string {
  const header = req.headers.traceparent
  const value = Array.isArray(header) ? header[0] : header
  return typeof value === 'string' && isValidTraceparent(value) ? value : createTraceparent()
}

function isValidTraceparent(value: string): boolean {
  // Поддерживаем только формат version 00.
  return /^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/.test(value)
}

function signatureMatches(message: string, signature: string, secret: string): boolean {
  // Считаем ожидаемую HMAC-подпись.
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  const givenBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')

  // timingSafeEqual защищает от timing attacks.
  return givenBuf.length === expectedBuf.length && timingSafeEqual(givenBuf, expectedBuf)
}

/**
 * Подписывает telegramUserId, чтобы downstream-сервисы доверяли, что он пришёл от bot-gateway.
 */
export function signUserId(userId: number, secret: string): string {
  return createHmac('sha256', secret).update(String(userId)).digest('hex')
}

/**
 * Достаёт и проверяет X-User-Id из headers.
 *
 * Возвращает undefined, если header отсутствует.
 * Бросает ошибку, если user id есть, но подпись неправильная.
 */
export function extractUserId(req: IncomingMessage, secret: string): number | undefined {
  const rawId = req.headers['x-user-id'] as string | undefined
  const rawSig = req.headers['x-user-sig'] as string | undefined

  if (!rawId) return undefined

  // Если user id есть, подпись обязательна.
  if (!rawSig) throw new Error('x-user-id present but x-user-sig missing')

  // Telegram user id должен быть положительным целым числом.
  const userId = Number(rawId)
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('invalid x-user-id')

  const expected = createHmac('sha256', secret).update(String(userId)).digest('hex')
  const a = Buffer.from(rawSig, 'hex')
  const b = Buffer.from(expected, 'hex')

  // Сравниваем подпись безопасным способом.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid x-user-sig')
  }

  return userId
}

// Данные, которые кладём в OAuth state.
type OAuthStateData = { telegramUserId: number; scope: string; resourceId?: string }

/**
 * Кодирует и подписывает OAuth state, чтобы его нельзя было подделать между redirect и callback.
 */
export function signOAuthState(data: OAuthStateData, secret: string): string {
  // payload — JSON в base64url, безопасный для URL.
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Проверяет и декодирует подписанный OAuth state.
 *
 * Бросает ошибку, если state повреждён или подделан.
 */
export function verifyOAuthState(state: string, secret: string): OAuthStateData {
  const lastDot = state.lastIndexOf('.')
  if (lastDot === -1) throw new Error('malformed oauth state')

  const payload = state.slice(0, lastDot)
  const givenSig = state.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')

  // Подпись проверяем timing-safe сравнением.
  const a = Buffer.from(givenSig, 'base64url')
  const b = Buffer.from(expectedSig, 'base64url')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid oauth state signature')
  }

  // После проверки подписи можно доверять payload.
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as OAuthStateData
}

/**
 * Читает тело HTTP-запроса с ограничением размера.
 *
 * Превышение MAX_BODY_BYTES разрушает соединение немедленно —
 * продолжать чтение при DoS-атаке бессмысленно и опасно.
 */
export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: string) => {
      // Собираем body постепенно.
      raw += chunk
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        // Если body слишком большой, сразу разрываем соединение.
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

/**
 * Читает и парсит JSON body.
 *
 * Проверяет content-type и лимит размера.
 */
export function readJsonBody<T>(req: IncomingMessage): Promise<{ raw: string; parsed: T }> {
  // Межсервисные POST/PATCH запросы должны быть JSON.
  const ct = req.headers['content-type'] ?? ''
  if (!ct.includes('application/json')) {
    return Promise.reject(new Error('content-type must be application/json'))
  }
  return readBody(req).then((raw) => ({ raw, parsed: JSON.parse(raw) as T }))
}

// Одна audit-запись.
type AuditEntry = {
  ts: string
  service: string
  action: string
  requestId?: string
  userId?: number
  [key: string]: unknown
}

/**
 * Записывает структурированную audit-запись в stdout.
 *
 * Audit log обязателен для мутирующих административных и платёжных действий.
 * Пишется в stdout (не stderr), чтобы log collector мог маршрутизировать
 * audit отдельно от error-логов.
 */
export function audit(entry: AuditEntry): void {
  console.log(JSON.stringify(entry))
}
