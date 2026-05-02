import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { buildAuthHeaders, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import type { BookingCancelledEvent, BookingCreatedEvent } from '@metrix/contracts'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3005)
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const ANALYTICS_SIGNING_SECRET = process.env.ANALYTICS_SIGNING_SECRET ?? ''

const TRUSTED = [
  { name: 'bot-gateway', secret: process.env.TRUSTED_GATEWAY_SECRET ?? '' },
  { name: 'admin-service', secret: process.env.TRUSTED_ADMIN_SECRET ?? '' },
].filter((c) => c.secret.length > 0)

if (TRUSTED.length === 0) {
  console.warn('analytics-service: no trusted secrets configured')
}

await bus.connect()

await bus.consume<BookingCreatedEvent>(STREAMS.BOOKING_CREATED, 'analytics-service', 'analytics-worker', async () => {
  console.log('analytics: booking.created event received')
})

await bus.consume<BookingCancelledEvent>(STREAMS.BOOKING_CANCELLED, 'analytics-service', 'analytics-cancel-worker', async () => {
  console.log('analytics: booking.cancelled event received')
})

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

  const fresh = await bus.checkReplay(auth.requestId)
  if (!fresh) return json(res, { error: 'replay detected' }, 409)

  try {
    if (method === 'GET' && path === '/stats') {
      const bookings = await fetchBookings()
      const active = bookings.filter((b) => b.status === 'active').length
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length
      const rescheduled = bookings.filter((b) => b.status === 'rescheduled').length
      const revenue = bookings.filter((b) => b.status === 'active').reduce((sum, b) => sum + b.paidAmountMinorUnits, 0)
      return json(res, { total: bookings.length, active, cancelled, rescheduled, revenue })
    }

    if (method === 'GET' && path === '/summary') {
      const bookings = await fetchBookings()
      const now = new Date()
      const monthAgo = new Date(now)
      monthAgo.setDate(monthAgo.getDate() - 30)
      const period = bookings.filter((b) => new Date(b.startsAtIso) >= monthAgo)
      const totalMins = period.reduce((sum, b) => {
        return sum + (new Date(b.endsAtIso).getTime() - new Date(b.startsAtIso).getTime()) / 60_000
      }, 0)
      return json(res, {
        period: { dateFrom: monthAgo.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) },
        totalBookings: period.length,
        activeBookings: period.filter((b) => b.status === 'active').length,
        cancelledBookings: period.filter((b) => b.status === 'cancelled').length,
        rescheduledBookings: period.filter((b) => b.status === 'rescheduled').length,
        totalOccupiedMinutes: Math.round(totalMins),
        averageBookingMinutes: period.length > 0 ? Math.round(totalMins / period.length) : 0,
        uniqueResources: new Set(period.map((b) => b.resourceId)).size,
      })
    }

    if (method === 'POST' && path === '/reports') {
      const body = parsedBody as { type?: unknown; requestedBy?: unknown }
      if (typeof body.type !== 'string' || !body.type) return json(res, { error: 'type required' }, 400)
      const report = await prisma.report.create({
        data: { type: body.type, status: 'pending', requestedBy: body.requestedBy ? BigInt(Number(body.requestedBy)) : undefined },
      })
      return json(res, { reportId: report.id, status: report.status }, 201)
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      const id = path.slice('/reports/'.length)
      const report = await prisma.report.findUnique({ where: { id } })
      if (!report) return json(res, { error: 'not found' }, 404)
      return json(res, { ...report, requestedBy: report.requestedBy ? Number(report.requestedBy) : undefined })
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('analytics-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`analytics-service listening on :${PORT}`))

type BookingRow = { status: string; paidAmountMinorUnits: number; startsAtIso: string; endsAtIso: string; resourceId: string }

async function fetchBookings(): Promise<BookingRow[]> {
  try {
    const headers = buildAuthHeaders('GET', '/bookings', '', 'analytics-service', ANALYTICS_SIGNING_SECRET)
    const r = await fetch(`${BOOKING_URL}/bookings`, { headers })
    return r.ok ? (r.json() as Promise<BookingRow[]>) : []
  } catch {
    return []
  }
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}
