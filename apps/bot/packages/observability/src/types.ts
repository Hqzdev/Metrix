// Одна запись лога для observability helper-ов.
export type ObservabilityLogEntry<TService extends string> = {
  error?: unknown
  message: string
  service: TService
  // Inject via getActiveTraceId() from @metrix/tracing for log-trace correlation.
  traceId?: string
  // Inject via getActiveSpanContext().spanId for precise span-level correlation.
  spanId?: string
  [key: string]: unknown
}

// Минимальный интерфейс логгера, который должны передать сервисы.
export type ObservabilityLogger<TService extends string> = {
  error: (entry: ObservabilityLogEntry<TService>) => void
  info: (entry: ObservabilityLogEntry<TService>) => void
  warn?: (entry: ObservabilityLogEntry<TService>) => void
}

// Ключ HTTP-метрики.
export type HttpMetricKey = {
  method: string
  route: string
  status: number
}

// Накопленные значения HTTP-метрики.
export type HttpMetricValue = {
  count: number
  durationSumMs: number
  buckets: Map<number, number>
}

// Gauge metric value.
export type GaugeValue = {
  labels: Record<string, string>
  name: string
  value: number
}

// Counter metric value.
export type CounterValue = {
  labels: Record<string, string>
  name: string
  value: number
}
