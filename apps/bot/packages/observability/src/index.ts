import type { IncomingMessage, Server, ServerResponse } from 'node:http'

// Сколько ждём graceful shutdown перед принудительным exit.
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000
// Buckets для HTTP latency histogram в миллисекундах.
const LATENCY_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000]

// Одна запись лога для observability helper-ов.
export type ObservabilityLogEntry<TService extends string> = {
  error?: unknown
  message: string
  service: TService
  [key: string]: unknown
}

// Минимальный интерфейс логгера, который должны передать сервисы.
export type ObservabilityLogger<TService extends string> = {
  error: (entry: ObservabilityLogEntry<TService>) => void
  info: (entry: ObservabilityLogEntry<TService>) => void
  warn?: (entry: ObservabilityLogEntry<TService>) => void
}

// Ключ HTTP-метрики.
type HttpMetricKey = {
  method: string
  route: string
  status: number
}

// Накопленные значения HTTP-метрики.
type HttpMetricValue = {
  count: number
  durationSumMs: number
  buckets: Map<number, number>
}

// Gauge metric value.
type GaugeValue = {
  labels: Record<string, string>
  name: string
  value: number
}

// Counter metric value.
type CounterValue = {
  labels: Record<string, string>
  name: string
  value: number
}

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

export function createObservedHandler(input: {
  handler: (req: IncomingMessage, res: ServerResponse) => void
  metrics: MetricsRegistry
  routeResolver?: (req: IncomingMessage) => string
}): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    // performance.now точнее Date.now для duration.
    const startedAt = performance.now()

    // finish сработает, когда response уже отправлен.
    res.once('finish', () => {
      input.metrics.observeHttpRequest({
        durationMs: performance.now() - startedAt,
        method: req.method ?? 'UNKNOWN',
        route: input.routeResolver?.(req) ?? normalizeRoute(req.url),
        status: res.statusCode,
      })
    })

    // После установки listener-а передаём запрос в настоящий handler.
    input.handler(req, res)
  }
}

export function sendMetrics(res: ServerResponse, metrics: MetricsRegistry): void {
  // Prometheus ожидает text/plain exposition format.
  res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' })
  res.end(metrics.renderPrometheus())
}

export async function sendReadiness(
  res: ServerResponse,
  checks: Record<string, () => Promise<void>>,
): Promise<void> {
  // Каждый check пишет ok/error в results.
  const results: Record<string, { error?: string; ok: boolean }> = {}

  await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        // Check сам решает, что значит "готов".
        await check()
        results[name] = { ok: true }
      } catch (error) {
        results[name] = {
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        }
      }
    }),
  )

  // Если хотя бы один check упал, сервис не ready.
  const ok = Object.values(results).every((result) => result.ok)
  res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ checks: results, ok }))
}

export function installGracefulShutdown<TService extends string>(input: {
  logger: ObservabilityLogger<TService>
  resources?: Array<() => Promise<void>>
  server?: Server
  service: TService
  timeoutMs?: number
}): void {
  // Защищает от двойной обработки SIGTERM/SIGINT.
  let shuttingDown = false

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return
    shuttingDown = true

    // Таймаут не даёт shutdown зависнуть навсегда.
    const timeoutMs = input.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS
    const timeout = setTimeout(() => {
      input.logger.error({
        message: 'Graceful shutdown timed out',
        service: input.service,
        signal,
        timeoutMs,
      })
      process.exit(1)
    }, timeoutMs)

    // Сначала закрываем HTTP server, потом внешние resources.
    void closeServer(input.server)
      .then(async () => {
        for (const close of input.resources ?? []) {
          // Resources закрываются последовательно, чтобы не создавать гонок.
          await close()
        }
        clearTimeout(timeout)
        input.logger.info({
          message: 'Graceful shutdown completed',
          service: input.service,
          signal,
        })
        process.exit(0)
      })
      .catch((error: unknown) => {
        clearTimeout(timeout)
        input.logger.error({
          error,
          message: 'Graceful shutdown failed',
          service: input.service,
          signal,
        })
        process.exit(1)
      })
  }

  // Kubernetes обычно шлёт SIGTERM, локально часто SIGINT.
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

export function normalizeRoute(rawUrl: string | undefined): string {
  // Нормализация нужна, чтобы не создавать отдельную метрику на каждый id.
  if (!rawUrl) return '/unknown'

  const path = rawUrl.split('?')[0] || '/'
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
    .replace(/\/[A-Za-z0-9_-]{16,}/g, '/:id')
}

async function closeServer(server: Server | undefined): Promise<void> {
  // Если сервера нет или он уже закрыт, делать нечего.
  if (!server || !server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function escapeLabel(value: string): string {
  // Экранируем значения labels для Prometheus.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function createMetricKey(name: string, labels: Record<string, string>): string {
  // Сортируем labels, чтобы одинаковые наборы давали одинаковый key.
  return `${name}|${Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${escapeKeyPart(key)}=${escapeKeyPart(value)}`).join('|')}`
}

function renderLabels(labels: Record<string, string>): string {
  // Превращает объект labels в prometheus label string.
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',')
}

function escapeKeyPart(value: string): string {
  // encodeURIComponent безопасно прячет separators.
  return encodeURIComponent(value)
}

function unescapeKeyPart(value: string): string {
  // Обратная операция для parseHttpKey.
  return decodeURIComponent(value)
}
