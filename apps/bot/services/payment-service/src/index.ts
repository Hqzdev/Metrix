import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { audit, buildAuthHeaders, extractUserId, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3003)
const PROVIDER_TOKEN = process.env.YOOKASSA_PROVIDER_TOKEN ?? ''
const CURRENCY = process.env.PAYMENT_CURRENCY ?? 'RUB'
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const PAYMENT_SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET ?? ''
const USER_ID_SECRET = process.env.USER_ID_SIGNING_SECRET ?? ''
const MAX_INVOICE = 9_900_000

const TRUSTED = [
  { name: 'bot-gateway', secret: process.env.TRUSTED_GATEWAY_SECRET ?? '' },
].filter((c) => c.secret.length > 0)

if (TRUSTED.length === 0) {
  console.warn('payment-service: no trusted secrets configured')
}

await bus.connect()

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

  let callerUserId: number | undefined
  try {
    callerUserId = USER_ID_SECRET ? extractUserId(req, USER_ID_SECRET) : undefined
  } catch {
    return json(res, { error: 'invalid user identity' }, 401)
  }

  try {
    if (method === 'POST' && path === '/invoices') {
      const body = parsedBody as { chatId?: unknown; messageId?: unknown; telegramUserId?: unknown; resourceId?: unknown; slotId?: unknown }
      const userId = callerUserId ?? Number(body.telegramUserId)
      if (!userId || !Number.isInteger(userId) || userId <= 0) return json(res, { error: 'invalid telegramUserId' }, 400)
      if (typeof body.resourceId !== 'string' || !body.resourceId) return json(res, { error: 'invalid resourceId' }, 400)
      if (typeof body.slotId !== 'string' || !body.slotId) return json(res, { error: 'invalid slotId' }, 400)

      const resource = await getResource(body.resourceId as string)
      if (!resource) return json(res, { error: 'resource not found' }, 404)

      const total = resource.priceMinorUnits
      const firstAmount = Math.min(MAX_INVOICE, total)
      const parts = Math.ceil(total / MAX_INVOICE)
      const invoiceId = makeId()

      await prisma.pendingInvoice.create({
        data: {
          id: invoiceId,
          amountMinorUnits: firstAmount,
          locationId: resource.locationId,
          paidAmountMinorUnits: 0,
          partNumber: 1,
          resourceId: body.resourceId as string,
          slotId: body.slotId as string,
          telegramUserId: BigInt(userId),
          totalAmountMinorUnits: total,
          totalParts: parts,
        },
      })

      await bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_invoice',
        chatId: Number(body.chatId),
        invoiceId,
        title: `Booking: ${resource.name}`,
        description: `${resource.name} — ${resource.priceLabel}`,
        payload: invoiceId,
        providerToken: PROVIDER_TOKEN,
        currency: CURRENCY,
        amount: firstAmount,
      })

      audit({ ts: new Date().toISOString(), service: 'payment', action: 'invoice.created', userId, invoiceId, resourceId: body.resourceId, requestId: auth.requestId })
      return json(res, { ok: true, invoiceId }, 201)
    }

    if (method === 'POST' && path === '/pre-checkout') {
      const body = parsedBody as { query?: { id: string; from: { id: number }; currency: string; total_amount: number; invoice_payload: string } }
      const query = body.query
      if (!query) return json(res, { ok: false, errorMessage: 'missing query' })

      const invoice = await prisma.pendingInvoice.findUnique({ where: { id: query.invoice_payload } })
      if (!invoice || Number(invoice.telegramUserId) !== query.from.id) {
        return json(res, { ok: false, errorMessage: 'Invoice not found for your account.' })
      }
      if (query.currency !== CURRENCY || query.total_amount !== invoice.amountMinorUnits) {
        return json(res, { ok: false, errorMessage: 'Payment amount mismatch.' })
      }
      return json(res, { ok: true })
    }

    if (method === 'POST' && path === '/successful-payment') {
      const body = parsedBody as { message?: { chat: { id: number }; from?: { id: number }; successful_payment: { invoice_payload: string; total_amount: number } } }
      const msg = body.message
      if (!msg) return json(res, { ok: false })

      const payload = msg.successful_payment.invoice_payload
      const invoice = await prisma.pendingInvoice.findUnique({ where: { id: payload } })

      if (!invoice || !msg.from || Number(invoice.telegramUserId) !== msg.from.id) {
        await bus.publish(STREAMS.NOTIFICATION_SEND, { type: 'send_message', chatId: msg.chat.id, text: 'Payment received, but booking could not be matched. Contact support.' })
        return json(res, { ok: false })
      }

      const paid = Number(invoice.paidAmountMinorUnits) + Number(invoice.amountMinorUnits)

      if (paid < Number(invoice.totalAmountMinorUnits)) {
        const nextAmount = Math.min(MAX_INVOICE, Number(invoice.totalAmountMinorUnits) - paid)
        const nextId = makeId()
        await prisma.pendingInvoice.delete({ where: { id: payload } })
        await prisma.pendingInvoice.create({
          data: { ...invoice, id: nextId, amountMinorUnits: nextAmount, paidAmountMinorUnits: paid, partNumber: Number(invoice.partNumber) + 1 },
        })
        await bus.publish(STREAMS.NOTIFICATION_SEND, {
          type: 'send_invoice',
          chatId: msg.chat.id,
          invoiceId: nextId,
          title: `Booking: part ${Number(invoice.partNumber) + 1}/${invoice.totalParts}`,
          description: 'Next payment',
          payload: nextId,
          providerToken: PROVIDER_TOKEN,
          currency: CURRENCY,
          amount: nextAmount,
        })
        return json(res, { ok: true })
      }

      await bus.publish(STREAMS.PAYMENT_COMPLETED, {
        telegramUserId: Number(invoice.telegramUserId),
        chatId: msg.chat.id,
        resourceId: invoice.resourceId,
        slotId: invoice.slotId,
        totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
        invoiceId: payload,
      })

      audit({ ts: new Date().toISOString(), service: 'payment', action: 'payment.completed', userId: Number(invoice.telegramUserId), invoiceId: payload })
      await prisma.pendingInvoice.delete({ where: { id: payload } })
      return json(res, { ok: true })
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('payment-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

// consume PAYMENT_COMPLETED → create booking via booking-service (signed service call)
await bus.consume<{ telegramUserId: number; chatId: number; resourceId: string; slotId: string; totalAmountMinorUnits: number }>(
  STREAMS.PAYMENT_COMPLETED,
  'payment-service',
  'payment-worker',
  async (event) => {
    const body = JSON.stringify({ telegramUserId: event.telegramUserId, resourceId: event.resourceId, slotId: event.slotId })
    const parsed = new URL(`${BOOKING_URL}/bookings`)
    const headers = buildAuthHeaders('POST', parsed.pathname, body, 'payment-service', PAYMENT_SIGNING_SECRET)
    const r = await fetch(`${BOOKING_URL}/bookings`, { method: 'POST', headers, body })
    const booking = await r.json() as { locationName?: string; resourceName?: string; startsAt?: string; endsAt?: string }

    await bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_message',
      chatId: event.chatId,
      text: ['Booking confirmed.', '', booking.locationName ?? '', booking.resourceName ?? '', `${booking.startsAt ?? ''} - ${booking.endsAt ?? ''}`].join('\n'),
    })
  },
)

server.listen(PORT, () => console.log(`payment-service listening on :${PORT}`))

async function getResource(resourceId: string): Promise<{ locationId: string; name: string; priceMinorUnits: number; priceLabel: string } | null> {
  try {
    const body = ''
    const headers = buildAuthHeaders('GET', `/resources/${resourceId}`, body, 'payment-service', PAYMENT_SIGNING_SECRET)
    const r = await fetch(`${BOOKING_URL}/resources/${resourceId}`, { headers })
    return r.ok ? (r.json() as Promise<{ locationId: string; name: string; priceMinorUnits: number; priceLabel: string }>) : null
  } catch {
    return null
  }
}

function makeId(): string {
  return `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status)
  res.end(JSON.stringify(data))
}
