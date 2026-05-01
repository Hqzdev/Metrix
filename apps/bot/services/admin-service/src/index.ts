import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.PORT ?? 3006)
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005'

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'
  res.setHeader('content-type', 'application/json')

  try {
    if (method === 'GET' && path === '/health') return json(res, { ok: true })

    if (method === 'GET' && path === '/bookings') {
      const r = await fetch(`${BOOKING_URL}/bookings`)
      return json(res, await r.json())
    }

    if (method === 'GET' && path === '/stats') {
      const r = await fetch(`${ANALYTICS_URL}/stats`)
      return json(res, await r.json())
    }

    if (method === 'GET' && path === '/summary') {
      const r = await fetch(`${ANALYTICS_URL}/summary`)
      return json(res, await r.json())
    }

    if (method === 'PATCH' && path.startsWith('/locations/')) {
      const id = path.slice('/locations/'.length)
      const body = await readBody<unknown>(req)
      const r = await fetch(`${BOOKING_URL}/locations/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return json(res, await r.json())
    }

    if (method === 'PATCH' && path.startsWith('/resources/')) {
      const id = path.slice('/resources/'.length)
      const body = await readBody<unknown>(req)
      const r = await fetch(`${BOOKING_URL}/resources/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return json(res, await r.json())
    }

    if (method === 'POST' && path === '/reports') {
      const body = await readBody<unknown>(req)
      const r = await fetch(`${ANALYTICS_URL}/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return json(res, await r.json(), 201)
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      const id = path.slice('/reports/'.length)
      const r = await fetch(`${ANALYTICS_URL}/reports/${id}`)
      return json(res, await r.json())
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('admin-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`admin-service listening on :${PORT}`))

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
