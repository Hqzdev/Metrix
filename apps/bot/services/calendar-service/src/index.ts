import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const prisma = new PrismaClient()
const PORT = Number(process.env.PORT ?? 3002)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/calendar/google/callback'
const TOKEN_SECRET = process.env.CALENDAR_TOKEN_SECRET ?? 'local-calendar-secret'

// ─── http server ──────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'
  res.setHeader('content-type', 'application/json')

  try {
    if (method === 'GET' && path === '/health') return json(res, { ok: true })

    // GET /connections?telegramUserId=&scope=
    if (method === 'GET' && path === '/connections') {
      const userId = url.searchParams.get('telegramUserId')
      const scope = url.searchParams.get('scope')
      if (!userId) return json(res, { error: 'telegramUserId required' }, 400)

      const where: Record<string, unknown> = { telegramUserId: BigInt(userId) }
      if (scope) where.scope = scope

      const rows = await prisma.calendarConnection.findMany({ where })
      return json(res, rows.map(decryptRow))
    }

    // POST /auth-url
    if (method === 'POST' && path === '/auth-url') {
      const body = await readBody<{ provider: string; telegramUserId: number; scope: string; resourceId?: string }>(req)
      if (body.provider !== 'google' || !GOOGLE_CLIENT_ID) return json(res, { error: 'provider not configured' }, 400)

      const state = Buffer.from(JSON.stringify({ telegramUserId: body.telegramUserId, scope: body.scope, resourceId: body.resourceId })).toString('base64url')
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

    // POST /oauth-callback (called by bot-gateway after redirect)
    if (method === 'POST' && path === '/oauth-callback') {
      const body = await readBody<{ code: string; state: string }>(req)
      const stateData = JSON.parse(Buffer.from(body.state, 'base64url').toString()) as { telegramUserId: number; scope: string; resourceId?: string }

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
      return json(res, decryptRow(conn), 201)
    }

    // DELETE /connections
    if (method === 'DELETE' && path === '/connections') {
      const body = await readBody<{ provider: string; telegramUserId: number }>(req)
      await prisma.calendarConnection.deleteMany({
        where: { provider: body.provider, scope: 'user', telegramUserId: BigInt(body.telegramUserId) },
      })
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
  const res = await fetch('https://oauth2.googleapis.com/token', {
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
    accessToken: row.accessToken ? decrypt(row.accessToken, TOKEN_SECRET) : undefined,
    refreshToken: decrypt(row.refreshToken, TOKEN_SECRET),
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}

function readBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c: string) => { raw += c })
    req.on('end', () => { try { resolve(JSON.parse(raw) as T) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}
