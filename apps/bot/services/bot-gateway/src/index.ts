import { setDefaultResultOrder } from 'node:dns'
import { createServer } from 'node:http'
import { buildAuthHeaders } from '@metrix/auth'
import { Bot } from './bot.js'
import { ServicesClient } from './services-client.js'
import { TelegramClient } from './telegram-client.js'

setDefaultResultOrder('ipv4first')

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')

const gatewaySigning = process.env.GATEWAY_SIGNING_SECRET ?? ''
const userIdSecret = process.env.USER_ID_SIGNING_SECRET ?? ''

if (!gatewaySigning) console.warn('bot-gateway: GATEWAY_SIGNING_SECRET not set — service auth disabled')
if (!userIdSecret) console.warn('bot-gateway: USER_ID_SIGNING_SECRET not set — user identity signing disabled')

const healthPort = Number(process.env.HEALTH_PORT ?? 3000)
const calendarServiceUrl = process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002'

const adminIds = (process.env.ADMIN_TELEGRAM_IDS ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean)

const services = new ServicesClient(
  {
    booking: process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3001',
    calendar: calendarServiceUrl,
    payment: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003',
    analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005',
    admin: process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3006',
  },
  { signing: gatewaySigning, userId: userIdSecret },
)

const telegram = new TelegramClient(token)
const bot = new Bot({ adminTelegramIds: adminIds, services, telegram })

// health endpoint + Google OAuth callback receiver
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

    // forward to calendar-service as a signed internal request
    const body = JSON.stringify({ code, state })
    const headers = buildAuthHeaders('POST', '/oauth-callback', body, 'bot-gateway', gatewaySigning)

    fetch(`${calendarServiceUrl}/oauth-callback`, { method: 'POST', headers, body })
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
