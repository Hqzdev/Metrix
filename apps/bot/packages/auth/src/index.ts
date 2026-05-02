import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_DRIFT_MS = 30_000
const MAX_BODY_BYTES = 64 * 1024

// ─── service-to-service signing ───────────────────────────────────────────────

export type TrustedCaller = { name: string; secret: string }

export type VerifyResult =
  | { ok: true; callerName: string; requestId: string }
  | { ok: false; error: string }

/**
 * Build headers that authenticate an outgoing inter-service request.
 * Signature covers: METHOD, path, timestamp, request-id, sha256(body).
 */
export function buildAuthHeaders(
  method: string,
  path: string,
  body: string,
  serviceName: string,
  signingSecret: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const requestId = randomUUID()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = createHmac('sha256', signingSecret).update(message).digest('hex')
  return {
    'content-type': 'application/json',
    'x-service-name': serviceName,
    'x-timestamp': timestamp,
    'x-request-id': requestId,
    'x-signature': signature,
  }
}

/**
 * Verify that an incoming request carries a valid service signature.
 * Must be called AFTER the body has been read (rawBody required for hash).
 */
export function verifyServiceRequest(
  req: IncomingMessage,
  rawBody: string,
  trusted: TrustedCaller[],
): VerifyResult {
  const name = req.headers['x-service-name'] as string | undefined
  const timestamp = req.headers['x-timestamp'] as string | undefined
  const requestId = req.headers['x-request-id'] as string | undefined
  const signature = req.headers['x-signature'] as string | undefined

  if (!name || !timestamp || !requestId || !signature) {
    return { ok: false, error: 'missing auth headers' }
  }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > MAX_DRIFT_MS) {
    return { ok: false, error: 'request expired or clock skew too large' }
  }

  const caller = trusted.find((c) => c.name === name)
  if (!caller) {
    return { ok: false, error: `unknown service: ${name}` }
  }

  const method = (req.method ?? 'GET').toUpperCase()
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname
  const bodyHash = createHash('sha256').update(rawBody).digest('hex')
  const message = [method, urlPath, timestamp, requestId, bodyHash].join('\n')
  const expected = createHmac('sha256', caller.secret).update(message).digest('hex')

  const givenBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')

  if (givenBuf.length !== expectedBuf.length || !timingSafeEqual(givenBuf, expectedBuf)) {
    return { ok: false, error: 'invalid signature' }
  }

  return { ok: true, callerName: name, requestId }
}

// ─── user identity (set only by bot-gateway) ──────────────────────────────────

/**
 * Sign a telegramUserId so downstream services can trust it came from bot-gateway.
 */
export function signUserId(userId: number, secret: string): string {
  return createHmac('sha256', secret).update(String(userId)).digest('hex')
}

/**
 * Extract and verify X-User-Id from request headers.
 * Returns undefined if header is absent (automated call, no user context).
 * Throws if header is present but signature is invalid.
 */
export function extractUserId(req: IncomingMessage, secret: string): number | undefined {
  const rawId = req.headers['x-user-id'] as string | undefined
  const rawSig = req.headers['x-user-sig'] as string | undefined

  if (!rawId) return undefined

  if (!rawSig) throw new Error('x-user-id present but x-user-sig missing')

  const userId = Number(rawId)
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('invalid x-user-id')

  const expected = createHmac('sha256', secret).update(String(userId)).digest('hex')
  const a = Buffer.from(rawSig, 'hex')
  const b = Buffer.from(expected, 'hex')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid x-user-sig')
  }

  return userId
}

// ─── oauth state signing ──────────────────────────────────────────────────────

type OAuthStateData = { telegramUserId: number; scope: string; resourceId?: string }

/**
 * Encode + sign OAuth state so it cannot be tampered with between redirect and callback.
 */
export function signOAuthState(data: OAuthStateData, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Verify and decode signed OAuth state.
 * Throws on tampered or malformed input.
 */
export function verifyOAuthState(state: string, secret: string): OAuthStateData {
  const lastDot = state.lastIndexOf('.')
  if (lastDot === -1) throw new Error('malformed oauth state')

  const payload = state.slice(0, lastDot)
  const givenSig = state.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')

  const a = Buffer.from(givenSig, 'base64url')
  const b = Buffer.from(expectedSig, 'base64url')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid oauth state signature')
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as OAuthStateData
}

// ─── body reader with size limit ──────────────────────────────────────────────

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: string) => {
      raw += chunk
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

/**
 * Read and parse JSON body. Enforces size limit and content-type.
 */
export function readJsonBody<T>(req: IncomingMessage): Promise<{ raw: string; parsed: T }> {
  const ct = req.headers['content-type'] ?? ''
  if (!ct.includes('application/json')) {
    return Promise.reject(new Error('content-type must be application/json'))
  }
  return readBody(req).then((raw) => ({ raw, parsed: JSON.parse(raw) as T }))
}

// ─── audit log ────────────────────────────────────────────────────────────────

type AuditEntry = {
  ts: string
  service: string
  action: string
  requestId?: string
  userId?: number
  [key: string]: unknown
}

export function audit(entry: AuditEntry): void {
  console.log(JSON.stringify(entry))
}
