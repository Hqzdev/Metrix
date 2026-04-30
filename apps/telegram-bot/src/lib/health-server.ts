import { createServer, type ServerResponse } from 'node:http'
import type { CalendarIntegrationService } from '../integrations/calendar/calendar-integration-service.js'
import type { TelegramClient } from './telegram-client.js'
import type { Logger } from './logger.js'

type HealthServerOptions = {
  calendarIntegration?: CalendarIntegrationService
  logger: Logger
  port: number
  startedAt: Date
  telegram?: TelegramClient
}

// запускает http-сервер для health check и oauth callback
export function startHealthServer(options: HealthServerOptions): void {
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const uptimeSeconds = Math.floor((Date.now() - options.startedAt.getTime()) / 1000)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', uptime_seconds: uptimeSeconds }))
      return
    }

    if (req.method === 'GET' && req.url?.startsWith('/calendar/google/callback')) {
      await handleGoogleCalendarCallback(req.url, res, options)
      return
    }

    res.writeHead(404)
    res.end()
  })

  server.listen(options.port, '127.0.0.1', () => {
    options.logger.info('Health check server started', { port: options.port })
  })

  server.on('error', (error) => {
    options.logger.error('Health check server error', { error })
  })
}

// принимает google oauth code и сохраняет подключение календаря
async function handleGoogleCalendarCallback(
  requestUrl: string,
  res: ServerResponse,
  options: HealthServerOptions,
): Promise<void> {
  if (!options.calendarIntegration || !options.telegram) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Calendar integration is not configured.')
    return
  }

  const url = new URL(requestUrl, `http://127.0.0.1:${options.port}`)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Google did not return authorization code.')
    return
  }

  try {
    const connection = await options.calendarIntegration.connectFromCallback({
      code,
      provider: 'google',
      state,
    })
    await options.telegram.sendMessage(connection.telegramUserId, 'Google Calendar connected.')
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Google Calendar connected. You can return to Telegram.')
  } catch (error) {
    options.logger.error('Failed to handle Google Calendar callback', { error })
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Failed to connect Google Calendar. Return to Telegram and try again.')
  }
}
