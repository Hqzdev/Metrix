import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MetricsRegistry } from './metrics-registry.js'
import { normalizeRoute } from './routes.js'

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
