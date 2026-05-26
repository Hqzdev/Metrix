/**
 * OpenTelemetry instrumentation bootstrap.
 *
 * This file MUST be loaded before any other module that opens network connections.
 * Load it with the Node.js --import flag in package.json:
 *
 *   "start": "node --import ./dist/instrumentation.js dist/index.js"
 *   "dev":   "tsx --import ./src/instrumentation.ts src/index.ts"
 *
 * The SDK auto-instruments node:http (inbound + outbound), so all inter-service
 * HTTP calls automatically carry W3C traceparent headers and spans are linked.
 *
 * To create manual spans inside business logic:
 *
 *   import { trace } from '@metrix/tracing'
 *   const tracer = trace.getTracer('booking-service')
 *   await tracer.startActiveSpan('create-booking', async (span) => {
 *     span.setAttribute('booking.resourceId', input.resourceId)
 *     try {
 *       const result = await createBooking(...)
 *       span.setStatus({ code: SpanStatusCode.OK })
 *       return result
 *     } catch (err) {
 *       span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
 *       throw err
 *     } finally {
 *       span.end()
 *     }
 *   }) 
 *
 * To correlate logs with traces add traceId to every log entry:
 *
 *   import { getActiveTraceId } from '@metrix/tracing'
 *   logger.info({ message: '...', service: 'booking-service', traceId: getActiveTraceId() })
 */
import { initTracing } from '@metrix/tracing'

await initTracing({
  service: 'booking-service',
  // version and otlpEndpoint are read from SERVICE_VERSION and
  // OTEL_EXPORTER_OTLP_ENDPOINT env vars automatically.
})
