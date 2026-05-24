import { LATENCY_BUCKETS_MS } from './constants.js'
import { createMetricKey, escapeKeyPart, escapeLabel, renderLabels, unescapeKeyPart } from './format.js'
import type { CounterValue, GaugeValue, HttpMetricKey, HttpMetricValue } from './types.js'

// Простая in-memory registry для Prometheus metrics.
export class MetricsRegistry {
  // Время старта процесса.
  private readonly startedAt = Date.now()
  private readonly counters = new Map<string, CounterValue>()
  private readonly httpMetrics = new Map<string, HttpMetricValue>()
  private readonly gauges = new Map<string, GaugeValue>()

  constructor(private readonly service: string) {}

  observeHttpRequest(input: HttpMetricKey & { durationMs: number }): void {
    // Группируем HTTP-метрики по method/route/status.
    const key = this.createHttpKey(input)
    const metric = this.httpMetrics.get(key) ?? {
      buckets: new Map(LATENCY_BUCKETS_MS.map((bucket) => [bucket, 0])),
      count: 0,
      durationSumMs: 0,
    }

    // Обновляем счётчик и сумму duration.
    metric.count += 1
    metric.durationSumMs += input.durationMs

    // Histogram buckets накопительные: если duration <= bucket, увеличиваем bucket.
    for (const bucket of LATENCY_BUCKETS_MS) {
      if (input.durationMs <= bucket) {
        metric.buckets.set(bucket, (metric.buckets.get(bucket) ?? 0) + 1)
      }
    }

    this.httpMetrics.set(key, metric)
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    // Gauge хранит последнее значение.
    this.gauges.set(createMetricKey(name, labels), { labels, name, value })
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    // Counter только увеличивается.
    const key = createMetricKey(name, labels)
    const counter = this.counters.get(key) ?? { labels, name, value: 0 }
    counter.value += value
    this.counters.set(key, counter)
  }

  renderPrometheus(): string {
    // Формируем текстовый формат Prometheus exposition.
    const lines: string[] = [
      '# HELP metrix_process_uptime_seconds Process uptime in seconds.',
      '# TYPE metrix_process_uptime_seconds gauge',
      `metrix_process_uptime_seconds{service="${escapeLabel(this.service)}"} ${Math.floor((Date.now() - this.startedAt) / 1000)}`,
      '# HELP metrix_http_requests_total Total HTTP requests.',
      '# TYPE metrix_http_requests_total counter',
    ]

    // HTTP request counters.
    for (const [key, metric] of this.httpMetrics.entries()) {
      const labels = this.parseHttpKey(key)
      lines.push(
        `metrix_http_requests_total{service="${escapeLabel(this.service)}",method="${labels.method}",route="${labels.route}",status="${labels.status}"} ${metric.count}`,
      )
    }

    // HTTP latency histogram.
    lines.push(
      '# HELP metrix_http_request_duration_ms HTTP request duration in milliseconds.',
      '# TYPE metrix_http_request_duration_ms histogram',
    )

    for (const [key, metric] of this.httpMetrics.entries()) {
      const labels = this.parseHttpKey(key)
      for (const [bucket, count] of metric.buckets.entries()) {
        lines.push(
          `metrix_http_request_duration_ms_bucket{service="${escapeLabel(this.service)}",method="${labels.method}",route="${labels.route}",status="${labels.status}",le="${bucket}"} ${count}`,
        )
      }
      lines.push(
        `metrix_http_request_duration_ms_bucket{service="${escapeLabel(this.service)}",method="${labels.method}",route="${labels.route}",status="${labels.status}",le="+Inf"} ${metric.count}`,
      )
      lines.push(
        `metrix_http_request_duration_ms_count{service="${escapeLabel(this.service)}",method="${labels.method}",route="${labels.route}",status="${labels.status}"} ${metric.count}`,
      )
      lines.push(
        `metrix_http_request_duration_ms_sum{service="${escapeLabel(this.service)}",method="${labels.method}",route="${labels.route}",status="${labels.status}"} ${metric.durationSumMs.toFixed(3)}`,
      )
    }

    // Custom gauges.
    for (const gauge of this.gauges.values()) {
      const labels = renderLabels({
        service: this.service,
        ...gauge.labels,
      })
      lines.push(`# TYPE ${gauge.name} gauge`)
      lines.push(`${gauge.name}{${labels}} ${gauge.value}`)
    }

    // Custom counters.
    for (const counter of this.counters.values()) {
      const labels = renderLabels({
        service: this.service,
        ...counter.labels,
      })
      lines.push(`# TYPE ${counter.name} counter`)
      lines.push(`${counter.name}{${labels}} ${counter.value}`)
    }

    return `${lines.join('\n')}\n`
  }

  private createHttpKey(input: HttpMetricKey): string {
    // escapeKeyPart нужен, чтобы separator | не ломал key.
    return [input.method, input.route, String(input.status)].map(escapeKeyPart).join('|')
  }

  private parseHttpKey(key: string): { method: string; route: string; status: string } {
    const [method, route, status] = key.split('|').map(unescapeKeyPart)
    return {
      method: escapeLabel(method ?? 'UNKNOWN'),
      route: escapeLabel(route ?? '/unknown'),
      status: escapeLabel(status ?? '0'),
    }
  }
}
