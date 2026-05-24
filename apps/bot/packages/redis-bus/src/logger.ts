import type { BusLogger } from './types.js'

// Дефолтный логгер: структурированный JSON в stderr.
export const defaultLogger: BusLogger = {
  error: (entry) => console.error(JSON.stringify({ ...entry, level: 'error', timestamp: new Date().toISOString() })),
  warn: (entry) => console.warn(JSON.stringify({ ...entry, level: 'warn', timestamp: new Date().toISOString() })),
}

export function serializeError(error: unknown): unknown {
  return error instanceof Error ? { name: error.name, message: error.message } : error
}
