import { context, trace } from '@opentelemetry/api'
import type { SpanContext } from '@opentelemetry/api'

/**
 * Returns the trace ID of the currently active span, or undefined if there is
 * no active span (e.g. request is not sampled, or tracing is not initialised).
 *
 * Use this to inject traceId into structured log entries so that logs and
 * traces can be correlated in Grafana / Jaeger:
 *
 *   logger.info({
 *     message: 'booking created',
 *     service: 'booking-service',
 *     traceId: getActiveTraceId(),
 *   })
 */
export function getActiveTraceId(): string | undefined {
  const span = trace.getActiveSpan()
  if (span === undefined) return undefined

  const ctx = span.spanContext()
  // isValid ensures we don't return the zero trace ID when there's no real trace.
  return isValidSpanContext(ctx) ? ctx.traceId : undefined
}

/**
 * Returns the full SpanContext (traceId + spanId + flags) of the active span.
 * Useful for adding both traceId and spanId to log entries.
 */
export function getActiveSpanContext(): SpanContext | undefined {
  const span = trace.getActiveSpan()
  if (span === undefined) return undefined

  const ctx = span.spanContext()
  return isValidSpanContext(ctx) ? ctx : undefined
}

// OTel marks a SpanContext invalid when traceId or spanId are all-zeros.
function isValidSpanContext(ctx: SpanContext): boolean {
  return (
    ctx.traceId !== '00000000000000000000000000000000' &&
    ctx.spanId !== '0000000000000000'
  )
}
