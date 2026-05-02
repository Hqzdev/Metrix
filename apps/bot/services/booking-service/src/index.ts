import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { audit, buildAuthHeaders, extractUserId, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import type { BlockSlotsInput, Booking, UpdateLocationInput, UpdateResourceInput } from '@metrix/contracts'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { createSlots } from './slots.js'
import { seedDatabase } from './seed.js'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3001)
const USER_ID_SECRET = process.env.USER_ID_SIGNING_SECRET ?? ''

const TRUSTED = [
  { name: 'bot-gateway', secret: process.env.TRUSTED_GATEWAY_SECRET ?? '' },
  { name: 'payment-service', secret: process.env.TRUSTED_PAYMENT_SECRET ?? '' },
  { name: 'analytics-service', secret: process.env.TRUSTED_ANALYTICS_SECRET ?? '' },
  { name: 'admin-service', secret: process.env.TRUSTED_ADMIN_SECRET ?? '' },
].filter((c) => c.secret.length > 0)

if (TRUSTED.length === 0) {
  console.warn('booking-service: no TRUSTED_*_SECRET env vars set — all requests will be rejected')
}

await bus.connect()
await seedDatabase(prisma)

// ─── http router ──────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'

  res.setHeader('content-type', 'application/json')

  if (method === 'GET' && path === '/health') return json(res, { ok: true })

  // read raw body first so we can verify signature (GET requests have empty body)
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

  // verify service-to-service signature
  const auth = verifyServiceRequest(req, rawBody, TRUSTED)
  if (!auth.ok) return json(res, { error: auth.error }, 401)

  // replay protection
  const fresh = await bus.checkReplay(auth.requestId)
  if (!fresh) return json(res, { error: 'replay detected' }, 409)

  // extract signed user id (present only for user-initiated requests)
  let callerUserId: number | undefined
  try {
    callerUserId = USER_ID_SECRET ? extractUserId(req, USER_ID_SECRET) : undefined
  } catch {
    return json(res, { error: 'invalid user identity' }, 401)
  }

  try {
    if (method === 'GET' && path === '/locations') {
      return json(res, await prisma.location.findMany())
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
      const bookedSlots = await prisma.booking.findMany({ where: { resourceId, status: 'active' }, select: { slotId: true } })
      const busySlots = await prisma.busySlot.findMany({ where: { resourceId }, select: { slotId: true } })
      const blocked = new Set([...bookedSlots.map((b) => b.slotId), ...busySlots.map((b) => b.slotId)])
      return json(res, createSlots(resourceId).filter((s) => !blocked.has(s.id)))
    }

    if (method === 'GET' && path === '/bookings') {
      // use signed X-User-Id if present, else fall back to query param (admin/automated calls)
      const userId = callerUserId ?? url.searchParams.get('telegramUserId')
      const rows = userId
        ? await prisma.booking.findMany({ where: { telegramUserId: BigInt(userId), status: 'active' } })
        : await prisma.booking.findMany()
      return json(res, rows.map(serializeBooking))
    }

    if (method === 'POST' && path === '/bookings') {
      const body = parsedBody as { resourceId?: unknown; slotId?: unknown; telegramUserId?: unknown }

      if (typeof body.resourceId !== 'string' || !body.resourceId) {
        return json(res, { error: 'invalid resourceId' }, 400)
      }
      if (typeof body.slotId !== 'string' || !body.slotId) {
        return json(res, { error: 'invalid slotId' }, 400)
      }

      // userId: prefer signed X-User-Id header, fall back to body (automated service calls)
      const rawUserId = callerUserId ?? body.telegramUserId
      if (!rawUserId || !Number.isInteger(Number(rawUserId)) || Number(rawUserId) <= 0) {
        return json(res, { error: 'invalid telegramUserId' }, 400)
      }
      const telegramUserId = Number(rawUserId)

      const resource = await prisma.resource.findUnique({ where: { id: body.resourceId }, include: { location: true } })
      if (!resource) return json(res, { error: 'resource not found' }, 404)

      const slot = createSlots(body.resourceId).find((s) => s.id === body.slotId)
      if (!slot) return json(res, { error: 'slot not found' }, 404)

      // atomic slot check + create via transaction — DB partial unique index is the final guard
      let booking
      try {
        booking = await prisma.$transaction(async (tx) => {
          const taken = await tx.booking.findFirst({ where: { resourceId: body.resourceId as string, slotId: body.slotId as string, status: 'active' } })
          if (taken) throw Object.assign(new Error('slot already booked'), { code: 'SLOT_TAKEN' })
          return tx.booking.create({
            data: {
              id: `booking-${Date.now()}`,
              locationId: resource.locationId,
              locationName: resource.location.name,
              resourceId: resource.id,
              resourceName: resource.name,
              slotId: body.slotId as string,
              telegramUserId: BigInt(telegramUserId),
              paidAmountMinorUnits: resource.priceMinorUnits,
              priceLabel: resource.priceLabel,
              startsAt: slot.startsAt,
              startsAtIso: new Date(slot.startsAtIso),
              endsAt: slot.endsAt,
              endsAtIso: new Date(slot.endsAtIso),
              status: 'active',
            },
          })
        })
      } catch (err) {
        if ((err as { code?: string }).code === 'SLOT_TAKEN') return json(res, { error: 'slot already booked' }, 409)
        // PostgreSQL unique violation from partial index
        if ((err as { code?: string }).code === 'P2002') return json(res, { error: 'slot already booked' }, 409)
        throw err
      }

      const result = serializeBooking(booking)
      await bus.publish(STREAMS.BOOKING_CREATED, { booking: result })
      audit({ ts: new Date().toISOString(), service: 'booking', action: 'booking.created', userId: telegramUserId, bookingId: result.id, requestId: auth.requestId, callerService: auth.callerName })
      return json(res, result, 201)
    }

    if (method === 'PATCH' && path.startsWith('/bookings/')) {
      const id = path.slice('/bookings/'.length)
      const body = parsedBody as { status?: unknown }

      if (typeof body.status !== 'string') return json(res, { error: 'invalid status' }, 400)
      const allowed = ['cancelled', 'rescheduled']
      if (!allowed.includes(body.status)) return json(res, { error: 'status must be cancelled or rescheduled' }, 400)

      const existing = await prisma.booking.findUnique({ where: { id } })
      if (!existing) return json(res, { error: 'not found' }, 404)

      // ownership check: if request comes from a user (X-User-Id present), verify they own the booking
      if (callerUserId !== undefined && Number(existing.telegramUserId) !== callerUserId) {
        audit({ ts: new Date().toISOString(), service: 'booking', action: 'booking.cancel.forbidden', userId: callerUserId, bookingId: id, requestId: auth.requestId })
        return json(res, { error: 'forbidden' }, 403)
      }

      const updated = await prisma.booking.update({ where: { id }, data: { status: body.status } })
      const result = serializeBooking(updated)
      if (body.status === 'cancelled') {
        await bus.publish(STREAMS.BOOKING_CANCELLED, { booking: result })
        audit({ ts: new Date().toISOString(), service: 'booking', action: 'booking.cancelled', userId: callerUserId ?? Number(existing.telegramUserId), bookingId: id, requestId: auth.requestId, callerService: auth.callerName })
      }
      return json(res, result)
    }

    if (method === 'POST' && path === '/slots/block') {
      const body = parsedBody as BlockSlotsInput
      await prisma.busySlot.deleteMany({ where: { resourceId: body.resourceId } })
      await prisma.busySlot.createMany({ data: body.slotIds.map((slotId) => ({ resourceId: body.resourceId, slotId })), skipDuplicates: true })
      return json(res, { ok: true })
    }

    if (method === 'PATCH' && path.startsWith('/locations/')) {
      const id = path.slice('/locations/'.length)
      const row = await prisma.location.update({ where: { id }, data: parsedBody as UpdateLocationInput })
      return json(res, row)
    }

    if (method === 'PATCH' && path.startsWith('/resources/')) {
      const id = path.slice('/resources/'.length)
      const row = await prisma.resource.update({ where: { id }, data: parsedBody as UpdateResourceInput })
      return json(res, row)
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('booking-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

server.listen(PORT, () => console.log(`booking-service listening on :${PORT}`))

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
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

// helper for analytics-service and payment-service that sign their internal calls
export function makeSignedFetch(signingSecret: string, serviceName: string) {
  return async function signedFetch(url: string, method: string, body: unknown): Promise<Response> {
    const bodyStr = body ? JSON.stringify(body) : ''
    const parsed = new URL(url)
    const headers = buildAuthHeaders(method, parsed.pathname, bodyStr, serviceName, signingSecret)
    return fetch(url, { method, headers, body: bodyStr || undefined })
  }
}
