import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import Redis from 'ioredis'
import { audit, buildAuthHeaders, readJsonBody, verifyServiceRequest } from '@metrix/auth'

const PORT = Number(process.env.PORT ?? 3006)
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005'
const ADMIN_SIGNING_SECRET = process.env.ADMIN_SIGNING_SECRET ?? ''

const TRUSTED = [
  { name: 'bot-gateway', secret: process.env.TRUSTED_GATEWAY_SECRET ?? '' },
].filter((c) => c.secret.length > 0)

if (TRUSTED.length === 0) {
  console.warn('admin-service: no TRUSTED_GATEWAY_SECRET set')
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true })
await redis.connect()

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

  try {
    if (method === 'GET' && path === '/bookings') {
      const r = await signedGet(`${BOOKING_URL}/bookings`)
      return json(res, await r.json())
    }

    if (method === 'GET' && path === '/stats') {
      const r = await signedGet(`${ANALYTICS_URL}/stats`)
      return json(res, await r.json())
    }

    if (method === 'GET' && path === '/summary') {
      const r = await signedGet(`${ANALYTICS_URL}/summary`)
      return json(res, await r.json())
    }

    if (method === 'PATCH' && path.startsWith('/locations/')) {
      const id = path.slice('/locations/'.length)
      const r = await signedPatch(`${BOOKING_URL}/locations/${id}`, parsedBody)
      const result = await r.json()
      audit({ ts: new Date().toISOString(), service: 'admin', action: 'location.updated', locationId: id, requestId: auth.requestId, callerService: auth.callerName })
      return json(res, result)
    }

    if (method === 'PATCH' && path.startsWith('/resources/')) {
      const id = path.slice('/resources/'.length)
      const r = await signedPatch(`${BOOKING_URL}/resources/${id}`, parsedBody)
      const result = await r.json()
      audit({ ts: new Date().toISOString(), service: 'admin', action: 'resource.updated', resourceId: id, requestId: auth.requestId, callerService: auth.callerName })
      return json(res, result)
    }

    if (method === 'POST' && path === '/reports') {
      const r = await signedPost(`${ANALYTICS_URL}/reports`, parsedBody)
      return json(res, await r.json(), 201)
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      const id = path.slice('/reports/'.length)
      const r = await signedGet(`${ANALYTICS_URL}/reports/${id}`)
      return json(res, await r.json())
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('admin-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`admin-service listening on :${PORT}`))

function signedGet(url: string): Promise<Response> {
  const parsed = new URL(url)
  const headers = buildAuthHeaders('GET', parsed.pathname, '', 'admin-service', ADMIN_SIGNING_SECRET)
  return fetch(url, { headers })
}

function signedPatch(url: string, body: unknown): Promise<Response> {
  const parsed = new URL(url)
  const bodyStr = JSON.stringify(body)
  const headers = buildAuthHeaders('PATCH', parsed.pathname, bodyStr, 'admin-service', ADMIN_SIGNING_SECRET)
  return fetch(url, { method: 'PATCH', headers, body: bodyStr })
}

function signedPost(url: string, body: unknown): Promise<Response> {
  const parsed = new URL(url)
  const bodyStr = JSON.stringify(body)
  const headers = buildAuthHeaders('POST', parsed.pathname, bodyStr, 'admin-service', ADMIN_SIGNING_SECRET)
  return fetch(url, { method: 'POST', headers, body: bodyStr })
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}
