// Минимальный интерфейс логгера для библиотеки.
export type BusLogger = {
  error: (entry: Record<string, unknown>) => void
  warn: (entry: Record<string, unknown>) => void
}

// Опции подключения Redis.
export type RedisBusOptions = {
  password?: string
}

// Опции consumer-а Redis Stream.
export type RedisConsumeOptions = {
  collectLagIntervalMs?: number
  onLag?: (lag: number) => void
  retryPendingIntervalMs?: number
}

// Raw response shape для XREADGROUP.
export type StreamReadResult = Array<[string, Array<[string, string[]]>]> | null

// Raw response shape для XPENDING IDLE.
export type PendingMessage = [string, string, number, number]

// Raw response shape для XCLAIM.
export type ClaimedMessage = [string, string[]]
