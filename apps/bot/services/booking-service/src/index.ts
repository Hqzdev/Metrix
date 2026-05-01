import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import type {
  BlockSlotsInput,
  Booking,
  BookingLocation,
  BookingResource,
  CreateBookingInput,
  UpdateLocationInput,
  UpdateResourceInput,
} from '@metrix/contracts'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { createSlots } from './slots.js'
import { seedDatabase } from './seed.js'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3001)

await bus.connect()
await seedDatabase(prisma)

// ─── http router ──────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'

  res.setHeader('content-type', 'application/json')

  try {
    if (method === 'GET' && path === '/health') {
      return json(res, { ok: true })
    }

    if (method === 'GET' && path === '/locations') {
      const rows = await prisma.location.findMany()
      return json(res, rows)
    }

    if (method === 'GET' && path === '/resources') {
      const locationId = url.searchParams.get('locationId')
      const rows = locationId
        ? await prisma.resource.findMany({ where: { locationId } })
        : await prisma.resource.findMany()
      return json(res, rows)
    }

    if (method === 'GET' && path.startsWith('/resources/')) {
      const id = path.slice('/resources/'.length)
      const row = await prisma.resource.findUnique({ where: { id } })
      if (!row) return json(res, { error: 'not found' }, 404)
      return json(res, row)
    }

    if (method === 'GET' && path === '/slots') {
      const resourceId = url.searchParams.get('resourceId')
      if (!resourceId) return json(res, { error: 'resourceId required' }, 400)

      const bookedSlots = await prisma.booking.findMany({
        where: { resourceId, status: 'active' },
        select: { slotId: true },
      })
      const busySlots = await prisma.busySlot.findMany({ where: { resourceId }, select: { slotId: true } })
      const blocked = new Set([...bookedSlots.map((b) => b.slotId), ...busySlots.map((b) => b.slotId)])
      const slots = createSlots(resourceId).filter((s) => !blocked.has(s.id))
      return json(res, slots)
    }

    if (method === 'POST' && path === '/bookings') {
      const body = await readBody<CreateBookingInput>(req)
      const resource = await prisma.resource.findUnique({ where: { id: body.resourceId }, include: { location: true } })
      if (!resource) return json(res, { error: 'resource not found' }, 404)

      const slot = createSlots(body.resourceId).find((s) => s.id === body.slotId)
      if (!slot) return json(res, { error: 'slot not found' }, 404)

      const booking = await prisma.booking.create({
        data: {
          id: `booking-${Date.now()}`,
          locationId: resource.locationId,
          locationName: resource.location.name,
          resourceId: resource.id,
          resourceName: resource.name,
          slotId: body.slotId,
          telegramUserId: BigInt(body.telegramUserId),
          paidAmountMinorUnits: resource.priceMinorUnits,
          priceLabel: resource.priceLabel,
          startsAt: slot.startsAt,
          startsAtIso: new Date(slot.startsAtIso),
          endsAt: slot.endsAt,
          endsAtIso: new Date(slot.endsAtIso),
          status: 'active',
        },
      })

      const result = serializeBooking(booking)
      await bus.publish(STREAMS.BOOKING_CREATED, { booking: result })
      return json(res, result, 201)
    }

    if (method === 'GET' && path === '/bookings') {
      const userId = url.searchParams.get('telegramUserId')
      const rows = userId
        ? await prisma.booking.findMany({ where: { telegramUserId: BigInt(userId), status: 'active' } })
        : await prisma.booking.findMany()
      return json(res, rows.map(serializeBooking))
    }

    if (method === 'PATCH' && path.startsWith('/bookings/')) {
      const id = path.slice('/bookings/'.length)
      const body = await readBody<{ status: string; telegramUserId: number }>(req)
      const booking = await prisma.booking.update({ where: { id }, data: { status: body.status } })
      const result = serializeBooking(booking)
      if (body.status === 'cancelled') {
        await bus.publish(STREAMS.BOOKING_CANCELLED, { booking: result })
      }
      return json(res, result)
    }

    if (method === 'POST' && path === '/slots/block') {
      const body = await readBody<BlockSlotsInput>(req)
      await prisma.busySlot.deleteMany({ where: { resourceId: body.resourceId } })
      await prisma.busySlot.createMany({
        data: body.slotIds.map((slotId) => ({ resourceId: body.resourceId, slotId })),
        skipDuplicates: true,
      })
      return json(res, { ok: true })
    }

    if (method === 'PATCH' && path.startsWith('/locations/')) {
      const id = path.slice('/locations/'.length)
      const body = await readBody<UpdateLocationInput>(req)
      const row = await prisma.location.update({ where: { id }, data: body })
      return json(res, row)
    }

    if (method === 'PATCH' && path.startsWith('/resources/')) {
      const id = path.slice('/resources/'.length)
      const body = await readBody<UpdateResourceInput>(req)
      const row = await prisma.resource.update({ where: { id }, data: body })
      return json(res, row)
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('booking-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`booking-service listening on :${PORT}`))

// ─── helpers ──────────────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}

function readBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: string) => { raw += chunk })
    req.on('end', () => { try { resolve(JSON.parse(raw) as T) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

function serializeBooking(b: Parameters<typeof serializeBooking>[0]): Booking {
  return {
    ...b,
    telegramUserId: Number(b.telegramUserId),
    startsAtIso: b.startsAtIso instanceof Date ? b.startsAtIso.toISOString() : String(b.startsAtIso),
    endsAtIso: b.endsAtIso instanceof Date ? b.endsAtIso.toISOString() : String(b.endsAtIso),
    status: b.status as Booking['status'],
    calendarEventGoogle: b.calendarEventGoogle ?? undefined,
    calendarEventMicrosoft: b.calendarEventMicrosoft ?? undefined,
  }
}
