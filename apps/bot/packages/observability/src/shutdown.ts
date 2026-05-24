import type { Server } from 'node:http'
import { DEFAULT_SHUTDOWN_TIMEOUT_MS } from './constants.js'
import type { ObservabilityLogger } from './types.js'

export function installGracefulShutdown<TService extends string>(input: {
  logger: ObservabilityLogger<TService>
  resources?: Array<() => Promise<void>>
  server?: Server
  service: TService
  timeoutMs?: number
}): void {
  // Защищает от двойной обработки SIGTERM/SIGINT.
  let shuttingDown = false

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return
    shuttingDown = true

    // Таймаут не даёт shutdown зависнуть навсегда.
    const timeoutMs = input.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS
    const timeout = setTimeout(() => {
      input.logger.error({
        message: 'Graceful shutdown timed out',
        service: input.service,
        signal,
        timeoutMs,
      })
      process.exit(1)
    }, timeoutMs)

    // Сначала закрываем HTTP server, потом внешние resources.
    void closeServer(input.server)
      .then(async () => {
        for (const close of input.resources ?? []) {
          // Resources закрываются последовательно, чтобы не создавать гонок.
          await close()
        }
        clearTimeout(timeout)
        input.logger.info({
          message: 'Graceful shutdown completed',
          service: input.service,
          signal,
        })
        process.exit(0)
      })
      .catch((error: unknown) => {
        clearTimeout(timeout)
        input.logger.error({
          error,
          message: 'Graceful shutdown failed',
          service: input.service,
          signal,
        })
        process.exit(1)
      })
  }

  // Kubernetes обычно шлёт SIGTERM, локально часто SIGINT.
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

async function closeServer(server: Server | undefined): Promise<void> {
  // Если сервера нет или он уже закрыт, делать нечего.
  if (!server || !server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}
