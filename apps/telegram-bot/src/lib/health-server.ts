import { createServer } from 'node:http'
import type { Logger } from './logger.js'

type HealthServerOptions = {
  logger: Logger
  port: number
  startedAt: Date
}

// запускает http-сервер на указанном порту для health check
export function startHealthServer(options: HealthServerOptions): void {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const uptimeSeconds = Math.floor((Date.now() - options.startedAt.getTime()) / 1000)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', uptime_seconds: uptimeSeconds }))
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
