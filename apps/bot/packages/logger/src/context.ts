import { hostname } from 'node:os'
import { trace } from '@opentelemetry/api'

/**
 * Неизменяемый контекст процесса — вычисляется один раз при старте.
 *
 * Эти поля одинаковы для всех логов одного контейнера/процесса,
 * поэтому выгоднее вычислить их один раз, а не при каждом вызове.
 */
export const processContext = {
  // NODE_ENV определяет окружение: development | staging | production.
  // Если переменная не задана, считаем development.
  env: process.env.NODE_ENV ?? 'development',
  // hostname() возвращает имя контейнера в Docker — идеально для multi-replica.
  hostname: hostname(),
  // PID текущего Node.js процесса.
  pid: process.pid,
} as const

/**
 * Пытается получить traceId и spanId из активного OpenTelemetry span-а.
 *
 * Использует @opentelemetry/api напрямую — безопасно если SDK не инициализирован:
 * в этом случае getActiveSpan() возвращает undefined и мы возвращаем пустой объект.
 *
 * Возвращает объект (а не отдельные значения), чтобы spread был одной операцией.
 */
export function getOtelContext(): { traceId?: string; spanId?: string } {
  try {
    // @opentelemetry/api безопасен без SDK: если tracing не инициализирован,
    // getActiveSpan() просто вернет undefined.
    const span = trace.getActiveSpan()
    if (!span) return {}

    const ctx = span.spanContext()

    // isValid проверяет что traceId и spanId не нулевые (0000...0000).
    const INVALID_TRACE = '00000000000000000000000000000000'
    const INVALID_SPAN = '0000000000000000'
    if (ctx.traceId === INVALID_TRACE || ctx.spanId === INVALID_SPAN) return {}

    return { traceId: ctx.traceId, spanId: ctx.spanId }
  } catch {
    // Никогда не падаем из-за трейсинга — это вспомогательная информация.
    return {}
  }
}
