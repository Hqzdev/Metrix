import { getOtelContext, processContext } from './context.js'
import { serializeError } from './serialize.js'
import type { LogInput, LogLevel, ServiceLogger } from './types.js'

/**
 * Пишет одну структурированную JSON-строку в stdout или stderr.
 *
 * Поля в финальном JSON объекте (каждое гарантировано присутствует):
 *
 *   level      — 'info' | 'warn' | 'error'
 *   timestamp  — ISO 8601, например "2026-05-25T10:30:00.123Z"
 *   service    — имя сервиса, например "booking-service"
 *   env        — окружение, например "production"
 *   hostname   — имя контейнера/хоста
 *   pid        — PID процесса
 *   message    — человекочитаемое сообщение
 *   traceId    — W3C trace id (если запрос трейсируется)
 *   spanId     — W3C span id (если запрос трейсируется)
 *
 * Плюс все произвольные поля из LogInput: requestId, bookingId, userId и т.д.
 */
function write(service: string, level: LogLevel, input: LogInput): void {
  const { error, ...rest } = input

  const payload = {
    // Бизнес-поля первыми — при чтении логов в консоли это удобнее.
    ...rest,
    // Обязательные системные поля.
    level,
    timestamp: new Date().toISOString(),
    service,
    ...processContext,
    // OTel поля инъектируются автоматически — сервисам ничего делать не нужно.
    ...getOtelContext(),
    // Error всегда последним — он объёмный и не должен "прятать" другие поля.
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  }

  // Один лог = одна строка. Это требование Loki, Vector и большинства агрегаторов.
  const line = JSON.stringify(payload)

  if (level === 'error') {
    // Ошибки в stderr — операционные инструменты (Docker, systemd) умеют их различать.
    process.stderr.write(line + '\n')
    return
  }

  process.stdout.write(line + '\n')
}

/**
 * Создаёт типизированный логгер для конкретного сервиса.
 *
 * Вызывается один раз в module scope каждого сервиса:
 *
 *   // logger.ts
 *   import { createLogger } from '@metrix/logger'
 *   export const logger = createLogger('booking-service')
 *   export type Logger = typeof logger
 *
 * Возвращаемый объект совместим с ObservabilityLogger<TService> из @metrix/observability.
 */
export function createLogger(service: string): ServiceLogger {
  return {
    info: (input: LogInput) => write(service, 'info', input),
    warn: (input: LogInput) => write(service, 'warn', input),
    error: (input: LogInput) => write(service, 'error', input),
  }
}
