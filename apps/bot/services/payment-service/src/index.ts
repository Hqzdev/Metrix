import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'

const prisma = new PrismaClient()
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')
const PORT = Number(process.env.PORT ?? 3003)
const PROVIDER_TOKEN = process.env.YOOKASSA_PROVIDER_TOKEN ?? ''
const CURRENCY = process.env.PAYMENT_CURRENCY ?? 'RUB'
const BOOKING_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001'
const MAX_INVOICE = 9_900_000

await bus.connect()

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method ?? 'GET'
  res.setHeader('content-type', 'application/json')

  try {
    if (method === 'GET' && path === '/health') return json(res, { ok: true })

    // POST /invoices — бот-gateway запрашивает создание инвойса
    if (method === 'POST' && path === '/invoices') {
      const body = await readBody<{ chatId: number; messageId: number; telegramUserId: number; resourceId: string; slotId: string }>(req)

      const resource = await getResource(body.resourceId)
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
          resourceId: body.resourceId,
          slotId: body.slotId,
          telegramUserId: BigInt(body.telegramUserId),
          totalAmountMinorUnits: total,
          totalParts: parts,
        },
      })

      // публикуем событие — notification-service отправит инвойс
      await bus.publish(STREAMS.NOTIFICATION_SEND, {
        type: 'send_invoice',
        chatId: body.chatId,
        invoiceId,
        title: `Booking: ${resource.name}`,
        description: `${resource.name} — ${resource.priceLabel}`,
        payload: invoiceId,
        providerToken: PROVIDER_TOKEN,
        currency: CURRENCY,
        amount: firstAmount,
      })

      return json(res, { ok: true, invoiceId }, 201)
    }

    // POST /pre-checkout — валидация перед списанием
    if (method === 'POST' && path === '/pre-checkout') {
      const body = await readBody<{ query: { id: string; from: { id: number }; currency: string; total_amount: number; invoice_payload: string } }>(req)
      const query = body.query

      const invoice = await prisma.pendingInvoice.findUnique({ where: { id: query.invoice_payload } })

      if (!invoice || Number(invoice.telegramUserId) !== query.from.id) {
        return json(res, { ok: false, errorMessage: 'Invoice not found for your account.' })
      }

      if (query.currency !== CURRENCY || query.total_amount !== invoice.amountMinorUnits) {
        return json(res, { ok: false, errorMessage: 'Payment amount mismatch.' })
      }

      return json(res, { ok: true })
    }

    // POST /successful-payment — после успешной оплаты
    if (method === 'POST' && path === '/successful-payment') {
      const body = await readBody<{ message: { chat: { id: number }; from?: { id: number }; successful_payment: { invoice_payload: string; total_amount: number } } }>(req)
      const msg = body.message
      const payload = msg.successful_payment.invoice_payload

      const invoice = await prisma.pendingInvoice.findUnique({ where: { id: payload } })

      if (!invoice || !msg.from || Number(invoice.telegramUserId) !== msg.from.id) {
        await bus.publish(STREAMS.NOTIFICATION_SEND, {
          type: 'send_message',
          chatId: msg.chat.id,
          text: 'Payment received, but booking could not be matched. Contact support.',
        })
        return json(res, { ok: false })
      }

      const paid = Number(invoice.paidAmountMinorUnits) + Number(invoice.amountMinorUnits)

      if (paid < Number(invoice.totalAmountMinorUnits)) {
        // нужен следующий платёж
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
          description: `Next payment`,
          payload: nextId,
          providerToken: PROVIDER_TOKEN,
          currency: CURRENCY,
          amount: nextAmount,
        })
        return json(res, { ok: true })
      }

      // оплата завершена — создаём бронь
      await bus.publish(STREAMS.PAYMENT_COMPLETED, {
        telegramUserId: Number(invoice.telegramUserId),
        chatId: msg.chat.id,
        resourceId: invoice.resourceId,
        slotId: invoice.slotId,
        totalAmountMinorUnits: Number(invoice.totalAmountMinorUnits),
        invoiceId: payload,
      })

      await prisma.pendingInvoice.delete({ where: { id: payload } })
      return json(res, { ok: true })
    }

    json(res, { error: 'not found' }, 404)
  } catch (err) {
    console.error('payment-service error', err)
    json(res, { error: 'internal error' }, 500)
  }
})

// слушаем событие PAYMENT_COMPLETED и создаём бронь через booking-service
await bus.consume<{ telegramUserId: number; chatId: number; resourceId: string; slotId: string; totalAmountMinorUnits: number }>(
  STREAMS.PAYMENT_COMPLETED,
  'payment-service',
  'payment-worker',
  async (event) => {
    const res = await fetch(`${BOOKING_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ telegramUserId: event.telegramUserId, resourceId: event.resourceId, slotId: event.slotId }),
    })
    const booking = await res.json()

    await bus.publish(STREAMS.NOTIFICATION_SEND, {
      type: 'send_message',
      chatId: event.chatId,
      text: [
        'Booking confirmed.',
        '',
        `${(booking as { locationName: string }).locationName}`,
        `${(booking as { resourceName: string }).resourceName}`,
        `${(booking as { startsAt: string }).startsAt} - ${(booking as { endsAt: string }).endsAt}`,
      ].join('\n'),
    })
  },
)

server.listen(PORT, () => console.log(`payment-service listening on :${PORT}`))

async function getResource(resourceId: string): Promise<{ locationId: string; name: string; priceMinorUnits: number; priceLabel: string } | null> {
  try {
    const r = await fetch(`${BOOKING_URL}/resources/${resourceId}`)
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

function readBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c: string) => { raw += c })
    req.on('end', () => { try { resolve(JSON.parse(raw) as T) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}
