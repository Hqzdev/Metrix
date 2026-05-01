import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import type { BookingCreatedEvent, BookingCancelledEvent } from '@metrix/contracts'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3005)
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'

await bus.connect()

// слушаем события броней для аналитики
await bus.consume<BookingCreatedEvent>(STREAMS.BOOKING_CREATED, 'analytics-service', 'analytics-worker', async () => {
  // данные читаем из booking-service, события используем как триггер инвалидации кэша
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

  try {
    if (method === 'GET' && path === '/health') return json(res, { ok: true })

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
        const start = new Date(b.startsAtIso)
        const end = new Date(b.endsAtIso)
        return sum + (end.getTime() - start.getTime()) / 60_000
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
      const body = await readBody<{ type: string; requestedBy?: number }>(req)
      const report = await prisma.report.create({
        data: { type: body.type, status: 'pending', requestedBy: body.requestedBy ? BigInt(body.requestedBy) : undefined },
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

async function fetchBookings(): Promise<Array<{ status: string; paidAmountMinorUnits: number; startsAtIso: string; endsAtIso: string; resourceId: string }>> {
  try {
    const r = await fetch(`${BOOKING_URL}/bookings`)
    return r.ok ? (r.json() as Promise<Array<{ status: string; paidAmountMinorUnits: number; startsAtIso: string; endsAtIso: string; resourceId: string }>>) : []
  } catch {
    return []
  }
}

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
