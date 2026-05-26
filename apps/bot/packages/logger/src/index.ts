/**
 * @metrix/logger
 *
 * Единый structured logger для всех микросервисов.
 *
 * Каждая запись — одна JSON-строка с гарантированными полями:
 *   level, timestamp, service, env, hostname, pid, message
 * И опциональными полями корреляции (инъектируются автоматически):
 *   traceId, spanId  — из активного OpenTelemetry span-а
 *
 * Использование:
 *
 *   // logger.ts в каждом сервисе
 *   import { createLogger } from '@metrix/logger'
 *   export const logger = createLogger('booking-service')
 *   export type Logger = typeof logger
 *
 *   // В обработчике
 *   logger.info({ message: 'booking created', bookingId: '...', requestId: '...' })
 *   logger.warn({ message: 'slot lock expired', resourceId: '...' })
 *   logger.error({ message: 'db query failed', error: err, requestId: '...' })
 *
 * Пример выходной строки:
 *   {
 *     "message": "booking created",
 *     "bookingId": "clx...",
 *     "requestId": "req_...",
 *     "level": "info",
 *     "timestamp": "2026-05-25T10:30:00.123Z",
 *     "service": "booking-service",
 *     "env": "production",
 *     "hostname": "booking-service-1",
 *     "pid": 1,
 *     "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
 *     "spanId": "00f067aa0ba902b7"
 *   }
 */

export { createLogger } from './logger.js'
export type { LogInput, LogLevel, SerializedError, ServiceLogger } from './types.js'
