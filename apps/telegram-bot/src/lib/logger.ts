type LogMeta = Record<string, unknown>

export type LogLevel = 'error' | 'info' | 'warn'

export type Logger = {
  info(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  error(message: string, meta?: LogMeta): void
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
}

export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = 'info') {}

  info(message: string, meta?: LogMeta): void {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify({ level: 'info', timestamp: now(), message, ...serializeMeta(meta) }))
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify({ level: 'warn', timestamp: now(), message, ...serializeMeta(meta) }))
    }
  }

  error(message: string, meta?: LogMeta): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify({ level: 'error', timestamp: now(), message, ...serializeMeta(meta) }))
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel]
  }
}

function now(): string {
  return new Date().toISOString()
}

function serializeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) return {}
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, value instanceof Error ? serializeError(value) : value]),
  )
}

function serializeError(error: Error): LogMeta {
  return { message: error.message, name: error.name, stack: error.stack }
}
