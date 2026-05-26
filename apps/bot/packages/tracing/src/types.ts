/**
 * Configuration for initTracing().
 */
export type TracingConfig = {
  /**
   * Logical service name — appears as `service.name` in every span.
   * Use the same name you pass to MetricsRegistry.
   * Example: 'booking-service'
   */
  service: string

  /**
   * Service version. Defaults to the SERVICE_VERSION env var or '0.0.0'.
   */
  version?: string

  /**
   * OTLP HTTP collector endpoint.
   * Defaults to OTEL_EXPORTER_OTLP_ENDPOINT env var, then 'http://jaeger:4318'.
   * Jaeger ≥ 1.35 accepts OTLP natively on port 4318 (HTTP) / 4317 (gRPC).
   */
  otlpEndpoint?: string

  /**
   * Sampling ratio between 0 and 1.
   * 1 = sample every request (default for development).
   * In production set via OTEL_TRACES_SAMPLER_ARG env var or this field.
   */
  sampleRatio?: number

  /**
   * Additional resource attributes merged into every span.
   * Example: { 'deployment.environment': 'production' }
   */
  resourceAttributes?: Record<string, string>
}
