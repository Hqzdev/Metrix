/**
 * @metrix/tracing
 *
 * Thin wrapper around the OpenTelemetry Node.js SDK.
 *
 * Usage — call initTracing() ONCE at the very start of each service,
 * before any other imports that open connections (Prisma, Redis, etc.):
 *
 *   // instrumentation.ts  (loaded via node --import ./instrumentation.js)
 *   import { initTracing } from '@metrix/tracing'
 *   await initTracing({ service: 'booking-service' })
 *
 * Then get a tracer anywhere:
 *   import { getTracer } from '@metrix/tracing'
 *   const tracer = getTracer('booking-service')
 *   await tracer.startActiveSpan('create-booking', async (span) => {
 *     // ... work ...
 *     span.end()
 *   })
 *
 * For log correlation, inject the active trace ID into every log line:
 *   import { getActiveTraceId } from '@metrix/tracing'
 *   logger.info({ message: 'booking created', traceId: getActiveTraceId() })
 */

export { getActiveTraceId, getActiveSpanContext } from './active-span.js'
export { extractTraceContext, injectTraceContext } from './propagation.js'
export { initTracing } from './sdk.js'
export type { TracingConfig } from './types.js'

// Re-export the OTel API so services don't need a direct @opentelemetry/api dep.
export { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'
export type { Span, Tracer } from '@opentelemetry/api'

/**
 * Returns a named tracer. Call once per module; the SDK is a singleton.
 */
export function getTracer(name: string): import('@opentelemetry/api').Tracer {
  return (await import('@opentelemetry/api')).trace.getTracer(name)
}
