import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import Redis from 'ioredis'
import { audit, extractUserId, readJsonBody, signOAuthState, verifyOAuthState, verifyServiceRequest } from '@metrix/auth'

const prisma = new PrismaClient()
const PORT = Number(process.env.PORT ?? 3002)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/calendar/google/callback'
const USER_ID_SECRET = process.env.USER_ID_SIGNING_SECRET ?? ''

// token secret is required — no fallback to avoid weak encryption in production
const TOKEN_SECRET = process.env.CALENDAR_TOKEN_SECRET
if (!TOKEN_SECRET) throw new Error('CALENDAR_TOKEN_SECRET env var is required')

const TRUSTED = [
  { name: 'bot-gateway', secret: process.env.TRUSTED_GATEWAY_SECRET ?? '' },
].filter((c) => c.secret.length > 0)

if (TRUSTED.length === 0) {
  console.warn('calendar-service: no TRUSTED_GATEWAY_SECRET set — all requests will be rejected')
}

// SSRF guard: only these hostnames may be contacted externally
const ALLOWED_EXTERNAL_HOSTS = new Set(['oauth2.googleapis.com', 'accounts.google.com'])

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true })
await redis.connect()

// ─── http server ──────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'
  res.setHeader('content-type', 'application/json')

  if (method === 'GET' && path === '/health') return json(res, { ok: true })

  let rawBody = ''
  let parsedBody: unknown = {}

  try {
    if (method !== 'GET') {
      const result = await readJsonBody<unknown>(req)
      rawBody = result.raw
      parsedBody = result.parsed
    }
  } catch (err) {
    return json(res, { error: (err as Error).message }, 400)
  }

  const auth = verifyServiceRequest(req, rawBody, TRUSTED)
  if (!auth.ok) return json(res, { error: auth.error }, 401)

  const fresh = await redis.set(`replay:${auth.requestId}`, '1', 'EX', 60, 'NX')
  if (fresh !== 'OK') return json(res, { error: 'replay detected' }, 409)

  let callerUserId: number | undefined
  try {
    callerUserId = USER_ID_SECRET ? extractUserId(req, USER_ID_SECRET) : undefined
  } catch {
    return json(res, { error: 'invalid user identity' }, 401)
  }

  try {
    if (method === 'GET' && path === '/connections') {
      const userId = callerUserId ?? Number(url.searchParams.get('telegramUserId'))
      if (!userId || !Number.isFinite(userId)) return json(res, { error: 'telegramUserId required' }, 400)
      const scope = url.searchParams.get('scope')
      const where: Record<string, unknown> = { telegramUserId: BigInt(userId) }
      if (scope) where.scope = scope
      const rows = await prisma.calendarConnection.findMany({ where })
      return json(res, rows.map(decryptRow))
    }

    if (method === 'POST' && path === '/auth-url') {
      const body = parsedBody as { provider?: unknown; telegramUserId?: unknown; scope?: unknown; resourceId?: unknown }
      if (body.provider !== 'google' || !GOOGLE_CLIENT_ID) return json(res, { error: 'provider not configured' }, 400)

      const userId = callerUserId ?? Number(body.telegramUserId)
      if (!userId || !Number.isFinite(userId)) return json(res, { error: 'invalid telegramUserId' }, 400)
      const scope = typeof body.scope === 'string' ? body.scope : 'user'
      const resourceId = typeof body.resourceId === 'string' ? body.resourceId : undefined

      // state is HMAC-signed to prevent telegramUserId forgery in OAuth redirect
      const state = signOAuthState({ telegramUserId: userId, scope, resourceId }, TOKEN_SECRET)
      const params = new URLSearchParams({
        access_type: 'offline',
        client_id: GOOGLE_CLIENT_ID,
        include_granted_scopes: 'true',
        prompt: 'consent',
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
        state,
      })
      return json(res, { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
    }

    if (method === 'POST' && path === '/oauth-callback') {
      const body = parsedBody as { code?: unknown; state?: unknown }
      if (typeof body.code !== 'string' || typeof body.state !== 'string') {
        return json(res, { error: 'code and state required' }, 400)
      }

      // verify HMAC-signed state — rejects any tampered telegramUserId
      let stateData: { telegramUserId: number; scope: string; resourceId?: string }
      try {
        stateData = verifyOAuthState(body.state, TOKEN_SECRET)
      } catch {
        return json(res, { error: 'invalid oauth state' }, 400)
      }

      const token = await exchangeGoogleCode(body.code)
      const conn = await prisma.calendarConnection.upsert({
        where: {
          provider_scope_telegramUserId_resourceId: {
            provider: 'google',
            scope: stateData.scope,
            telegramUserId: BigInt(stateData.telegramUserId),
            resourceId: stateData.resourceId ?? null,
          },
        },
        update: {
          accessToken: encrypt(token.access_token, TOKEN_SECRET),
          refreshToken: encrypt(token.refresh_token ?? token.access_token, TOKEN_SECRET),
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
        create: {
          provider: 'google',
          scope: stateData.scope,
          telegramUserId: BigInt(stateData.telegramUserId),
          resourceId: stateData.resourceId,
          calendarId: 'primary',
          accessToken: encrypt(token.access_token, TOKEN_SECRET),
          refreshToken: encrypt(token.refresh_token ?? token.access_token, TOKEN_SECRET),
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
      })
      audit({ ts: new Date().toISOString(), service: 'calendar', action: 'calendar.connected', userId: stateData.telegramUserId, provider: 'google', requestId: auth.requestId })
      return json(res, decryptRow(conn), 201)
    }

    if (method === 'DELETE' && path === '/connections') {
      const body = parsedBody as { provider?: unknown; telegramUserId?: unknown }
      const userId = callerUserId ?? Number(body.telegramUserId)
      if (!userId || !Number.isFinite(userId)) return json(res, { error: 'invalid telegramUserId' }, 400)
      if (typeof body.provider !== 'string') return json(res, { error: 'provider required' }, 400)

      await prisma.calendarConnection.deleteMany({
        where: { provider: body.provider, scope: 'user', telegramUserId: BigInt(userId) },
      })
      audit({ ts: new Date().toISOString(), service: 'calendar', action: 'calendar.disconnected', userId, provider: body.provider, requestId: auth.requestId })
      return json(res, { ok: true })
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('calendar-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`calendar-service listening on :${PORT}`))

// ─── google oauth ─────────────────────────────────────────────────────────────

async function exchangeGoogleCode(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const target = new URL('https://oauth2.googleapis.com/token')
  if (!ALLOWED_EXTERNAL_HOSTS.has(target.hostname)) throw new Error(`SSRF: disallowed host ${target.hostname}`)

  const res = await fetch(target.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>
}

// ─── encryption ───────────────────────────────────────────────────────────────

function encrypt(value: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`
}

function decrypt(value: string, secret: string): string {
  const [iv, tag, enc] = value.split('.').map((p) => Buffer.from(p, 'base64'))
  const d = createDecipheriv('aes-256-gcm', keyFrom(secret), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

function decryptRow(row: { accessToken?: string | null; refreshToken: string; telegramUserId: bigint; expiresAt?: Date | null; [key: string]: unknown }) {
  return {
    ...row,
    telegramUserId: Number(row.telegramUserId),
    expiresAt: row.expiresAt?.toISOString() ?? undefined,
    accessToken: row.accessToken ? decrypt(row.accessToken, TOKEN_SECRET!) : undefined,
    refreshToken: decrypt(row.refreshToken, TOKEN_SECRET!),
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}
