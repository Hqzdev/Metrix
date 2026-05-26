import { context, propagation, trace } from '@opentelemetry/api'
import type { IncomingMessage } from 'node:http'

/**
 * Extracts W3C TraceContext (traceparent / tracestate) from an incoming HTTP
 * request's headers and returns an OTel context that child spans will inherit.
 *
 * Use this when you make outbound calls *inside* a service that isn't
 * auto-instrumented, or when you need the context object explicitly:
 *
 *   const ctx = extractTraceContext(req)
 *   context.with(ctx, () => {
 *     // spans created here are children of the incoming request's trace
 *   })
 *
 * Note: HttpInstrumentation (configured in sdk.ts) does this automatically for
 * all node:http handlers. You only need this function for manual span creation.
 */
export function extractTraceContext(req: IncomingMessage): import('@opentelemetry/api').Context {
  // OTel propagation API expects a getter that reads header values by name.
  const carrier: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      carrier[key] = value
    } else if (Array.isArray(value)) {
      // HTTP spec allows multiple values for the same header; take the first.
      carrier[key] = value[0] ?? ''
    }
  }

  return propagation.extract(context.active(), carrier)
}

/**
 * Injects W3C TraceContext headers into a plain headers object so that the
 * active trace is propagated to downstream services on outbound HTTP calls.
 *
 * Use this when calling downstream services via node:http directly (e.g. in
 * the @metrix/contracts internal HTTP client), to ensure the trace continues
 * across service boundaries:
 *
 *   const headers: Record<string, string> = { 'content-type': 'application/json' }
 *   injectTraceContext(headers)
 *   // headers now contains traceparent (and optionally tracestate)
 *
 * Note: HttpInstrumentation handles outbound calls from node:http/https
 * automatically. You only need this for fetch() or custom HTTP clients.
 */
export function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers)
}

/**
 * Convenience: returns the traceparent header value for the active span.
 * Returns undefined when there is no active trace.
 *
 * Useful for logging the outbound traceparent for debugging.
 */
export function getTraceparentHeader(): string | undefined {
  const span = trace.getActiveSpan()
  if (!span) return undefined

  const { traceId, spanId, traceFlags } = span.spanContext()
  const flags = traceFlags.toString(16).padStart(2, '0')
  return `00-${traceId}-${spanId}-${flags}`
}
