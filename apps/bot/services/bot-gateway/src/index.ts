import { setDefaultResultOrder } from 'node:dns'
import { createServer } from 'node:http'
import { Bot } from './bot.js'
import { ServicesClient } from './services-client.js'
import { TelegramClient } from './telegram-client.js'

setDefaultResultOrder('ipv4first')

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')

const healthPort = Number(process.env.HEALTH_PORT ?? 3000)
const adminIds = (process.env.ADMIN_TELEGRAM_IDS ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean)

const services = new ServicesClient({
  booking: process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001',
  calendar: process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002',
  payment: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003',
  analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005',
  admin: process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3006',
})

const telegram = new TelegramClient(token)

const bot = new Bot({ adminTelegramIds: adminIds, services, telegram })

// health + OAuth callback сервер
const server = createServer((req, res) => {
  if (req.url?.startsWith('/calendar/google/callback')) {
    const url = new URL(req.url, `http://localhost:${healthPort}`)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      res.writeHead(400)
      res.end('missing code or state')
      return
    }

    // делегируем calendar-service
    fetch(`${process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002'}/oauth-callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(() => {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<html><body><h2>Calendar connected. Return to Telegram.</h2></body></html>')
      })
      .catch(() => {
        res.writeHead(500)
        res.end('Connection failed.')
      })
    return
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(healthPort, () => {
  console.log(`bot-gateway health server listening on :${healthPort}`)
})

bot.start().catch((err: unknown) => {
  console.error('bot failed to start', err)
  process.exitCode = 1
})
