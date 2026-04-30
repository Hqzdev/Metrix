import type { Logger } from './logger.js'

type UptimeMonitorOptions = {
  intervalMs: number
  logger: Logger
  url: string
}

// запускает периодический ping на heartbeat URL и выполняет первый пинг немедленно
export function startUptimeMonitor(options: UptimeMonitorOptions): void {
  void ping(options)
  setInterval(() => void ping(options), options.intervalMs)
}

async function ping(options: UptimeMonitorOptions): Promise<void> {
  try {
    await fetch(options.url, { method: 'GET' })
  } catch (error) {
    options.logger.warn('Uptime monitor ping failed', { url: options.url, error })
  }
}
