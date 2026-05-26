import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { Resource } from '@opentelemetry/resources'
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import type { TracingConfig } from './types.js'

let _sdk: NodeSDK | null = null

/**
 * Initialises the OpenTelemetry SDK.
 *
 * Must be called once, at the very start of the process, before any
 * import that opens network connections (Prisma, ioredis, node:http, etc.).
 *
 * The function is idempotent: subsequent calls are no-ops.
 *
 * Instrumented automatically:
 *   - node:http / node:https  (inbound + outbound — trace context propagated)
 *
 * For Prisma spans add @opentelemetry/instrumentation-prisma-client to the
 * service's own devDependencies and pass it in config.instrumentations.
 */
export async function initTracing(config: TracingConfig): Promise<void> {
  // Idempotency guard: only initialise once per process.
  if (_sdk !== null) return

  const endpoint =
    config.otlpEndpoint ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    'http://jaeger:4318'

  const sampleRatio =
    config.sampleRatio ??
    (process.env.OTEL_TRACES_SAMPLER_ARG
      ? Number(process.env.OTEL_TRACES_SAMPLER_ARG)
      : 1.0)

  const version =
    config.version ??
    process.env.SERVICE_VERSION ??
    '0.0.0'

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.service,
    [ATTR_SERVICE_VERSION]: version,
    // Deployment environment for filtering in Jaeger / Grafana Tempo.
    'deployment.environment': process.env.NODE_ENV ?? 'development',
    ...config.resourceAttributes,
  })

  const exporter = new OTLPTraceExporter({
    // /v1/traces is the standard OTLP HTTP traces path.
    url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
  })

  _sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
    sampler: new TraceIdRatioBasedSampler(sampleRatio),
    instrumentations: [
      // Auto-instruments node:http and node:https.
      // Injects W3C traceparent/tracestate headers on outbound requests,
      // extracts them from inbound requests.
      new HttpInstrumentation({
        // Don't trace health/metrics endpoints — they create noise.
        ignoreIncomingRequestHook: (req) => {
          const url = req.url ?? ''
          return url === '/health' || url === '/ready' || url === '/metrics'
        },
      }),
    ],
  })

  _sdk.start()

  // Flush spans on graceful shutdown. The observability package already handles
  // SIGTERM/SIGINT; this hooks into the same signal to flush the SDK.
  process.once('SIGTERM', () => void _sdk?.shutdown())
  process.once('SIGINT', () => void _sdk?.shutdown())
}
