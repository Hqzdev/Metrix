import type { IncomingMessage, ServerResponse } from 'node:http'
import { runHealthChecks } from './runner.js'
import type { HealthCheckOptions } from './types.js'

/**
 * Обработчик GET /health для HTTP-сервисов.
 *
 * Проверяет реальную доступность зависимостей — не просто "процесс жив".
 * Docker healthcheck и load balancer используют статус-код:
 *   200 — сервис готов принимать трафик
 *   503 — сервис жив, но зависимость недоступна (убираем из ротации)
 *
 * Latency включается в ответ — полезно для отладки медленных DB/Redis.
 */
export async function handleHealthCheck(res: ServerResponse, opts: HealthCheckOptions): Promise<void> {
  // timeout по умолчанию 3 секунды на каждую зависимость.
  const result = await runHealthChecks(opts, opts.timeout ?? 3_000)
  const status = result.ok ? 200 : 503
  // HTTP status отражает готовность сервиса.
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(result))
}

/**
 * Встраивает health-проверку в уже существующий HTTP-сервер.
 * Вызывать в начале request handler'а до auth.
 */
export function isHealthCheckRequest(req: IncomingMessage): boolean {
  // Health endpoint обычно открыт без auth.
  return req.method === 'GET' && req.url === '/health'
}
