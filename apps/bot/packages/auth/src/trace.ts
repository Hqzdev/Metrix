import { randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

/**
 * Создаёт W3C traceparent header.
 */
export function createTraceparent(): string {
  const traceId = randomBytes(16).toString('hex')
  const spanId = randomBytes(8).toString('hex')
  return `00-${traceId}-${spanId}-01`
}

/**
 * Читает traceparent из запроса или создаёт новый.
 */
export function readTraceparent(req: IncomingMessage): string {
  const header = req.headers.traceparent
  const value = Array.isArray(header) ? header[0] : header
  return typeof value === 'string' && isValidTraceparent(value) ? value : createTraceparent()
}

function isValidTraceparent(value: string): boolean {
  // Поддерживаем только формат version 00.
  return /^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/.test(value)
}
