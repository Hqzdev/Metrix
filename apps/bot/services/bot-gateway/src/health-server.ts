import { buildAuthHeaders } from '@metrix/auth'
import { MetricsRegistry, createObservedHandler, sendMetrics, sendReadiness } from '@metrix/observability'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { BotGatewayLogger } from './logger.js'
import type { TelegramUpdate } from './telegram-types.js'

// Таймаут проксирования OAuth callback в calendar-service.
const OAUTH_CALLBACK_TIMEOUT_MS = 10_000

// Настройки HTTP-сервера bot-gateway.
type HealthServerOptions = {
  calendarServiceUrl: string
  logger: BotGatewayLogger
  metrics?: MetricsRegistry
  port: number
  readinessChecks?: Record<string, () => Promise<void>>
  signingSecret: string
  telegramWebhookSecret?: string
  webhookHandler?: (update: TelegramUpdate) => Promise<void>
}

/**
 * Запускает health endpoint и Google OAuth callback boundary.
 *
 * Callback сразу проксируется в calendar-service подписанным внутренним
 * запросом, чтобы OAuth code не обрабатывался в gateway бизнес-логикой.
 */
export function startHealthServer(options: HealthServerOptions): Server {
  // Если metrics не передали, создаём отдельный registry.
  const metrics = options.metrics ?? new MetricsRegistry('bot-gateway')
  const server = createServer(
    createObservedHandler({
      metrics,
      handler: (req, res) => {
        // Telegram webhook endpoint.
        if (req.url === '/telegram/webhook') {
          void handleTelegramWebhook(req, res, options)
          return
        }

        // Google OAuth callback endpoint.
        if (req.url?.startsWith('/calendar/google/callback')) {
          void handleGoogleCalendarCallback(req.url, res, options)
          return
        }

        // Liveness endpoint.
        if (req.url === '/health') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
          return
        }

        // Readiness endpoint.
        if (req.url === '/ready') {
          void sendReadiness(res, options.readinessChecks ?? {})
          return
        }

        // Metrics endpoint.
        if (req.url === '/metrics') {
          sendMetrics(res, metrics)
          return
        }

        res.writeHead(404)
        res.end()
      },
    }),
  )

  server.listen(options.port, () => {
    options.logger.info({
      message: `bot-gateway health server listening on :${options.port}`,
      service: 'bot-gateway',
    })
  })

  return server
}

/**
 * Обрабатывает Telegram webhook update.
 */
async function handleTelegramWebhook(req: IncomingMessage, res: ServerResponse, options: HealthServerOptions): Promise<void> {
  // Telegram webhook должен приходить POST-запросом.
  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end()
    return
  }

  // Если handler не передали, webhook mode не включён.
  if (!options.webhookHandler) {
    res.writeHead(404)
    res.end()
    return
  }

  // Secret token защищает webhook от чужих POST-запросов.
  const expectedSecret = options.telegramWebhookSecret
  if (expectedSecret) {
    const actualSecret = req.headers['x-telegram-bot-api-secret-token']
    if (actualSecret !== expectedSecret) {
      res.writeHead(401)
      res.end()
      return
    }
  }

  try {
    // Читаем raw body и парсим Telegram update.
    const rawBody = await readBody(req)
    const update = JSON.parse(rawBody) as TelegramUpdate
    await options.webhookHandler(update)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  } catch (error) {
    options.logger.error({
      action: 'telegram.webhook',
      error,
      message: 'Failed to handle Telegram webhook update',
      service: 'bot-gateway',
    })
    res.writeHead(500)
    res.end()
  }
}

/**
 * Обрабатывает локальный callback Google OAuth и возвращает HTML-ответ пользователю.
 */
async function handleGoogleCalendarCallback(urlPath: string, res: ServerResponse, options: HealthServerOptions): Promise<void> {
  // URL строим с localhost base, потому что приходит только path + query.
  const url = new URL(urlPath, `http://localhost:${options.port}`)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // Google должен вернуть и code, и state.
  if (!code || !state) {
    res.writeHead(400)
    res.end('missing code or state')
    return
  }

  try {
    // Реальную обработку делает calendar-service.
    await forwardOAuthCallback({ code, options, state })
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<html><body><h2>Calendar connected. Return to Telegram.</h2></body></html>')
  } catch (error) {
    options.logger.error({
      action: 'calendar.oauth_callback',
      error,
      message: 'Failed to forward calendar OAuth callback',
      service: 'bot-gateway',
    })
    res.writeHead(500)
    res.end('Connection failed.')
  }
}

/**
 * Передаёт OAuth code и state из gateway в calendar-service.
 */
async function forwardOAuthCallback(input: { code: string; options: HealthServerOptions; state: string }): Promise<void> {
  // Подписываем внутренний POST в calendar-service.
  const body = JSON.stringify({ code: input.code, state: input.state })
  const headers = buildAuthHeaders('POST', '/oauth-callback', body, 'bot-gateway', input.options.signingSecret)
  const response = await fetch(`${input.options.calendarServiceUrl}/oauth-callback`, {
    body,
    headers,
    method: 'POST',
    signal: AbortSignal.timeout(OAUTH_CALLBACK_TIMEOUT_MS),
  })

  // Если calendar-service не принял callback, пользователь увидит Connection failed.
  if (!response.ok) {
    throw new Error(`calendar-service oauth callback failed: ${response.status}`)
  }
}

/**
 * Читает тело HTTP-запроса в строку.
 */
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}
