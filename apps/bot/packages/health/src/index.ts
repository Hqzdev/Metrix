import type { PrismaClient } from '@prisma/client'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Redis } from 'ioredis'

type HealthCheckResult = {
  ok: boolean
  uptime: number
  timestamp: string
  checks: {
    db?: { ok: boolean; latencyMs?: number; error?: string }
    redis?: { ok: boolean; latencyMs?: number; error?: string }
  }
}

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
export async function handleHealthCheck(
  res: ServerResponse,
  opts: { prisma?: PrismaClient; redis?: Redis; timeout?: number },
): Promise<void> {
  const timeout = opts.timeout ?? 3_000
  const result = await runHealthChecks(opts, timeout)
  const status = result.ok ? 200 : 503
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(result))
}

/**
 * Возвращает результат health check без HTTP — для встраивания в любой router.
 */
export async function runHealthChecks(
  opts: { prisma?: PrismaClient; redis?: Redis; timeout?: number },
  timeout = 3_000,
): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {}
  let allOk = true

  if (opts.prisma) {
    const dbResult = await checkDb(opts.prisma, timeout)
    checks.db = dbResult
    if (!dbResult.ok) allOk = false
  }

  if (opts.redis) {
    const redisResult = await checkRedis(opts.redis, timeout)
    checks.redis = redisResult
    if (!redisResult.ok) allOk = false
  }

  return {
    ok: allOk,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  }
}

async function checkDb(
  prisma: PrismaClient,
  timeout: number,
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

async function checkRedis(
  redis: Redis,
  timeout: number,
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Встраивает health-проверку в уже существующий HTTP-сервер.
 * Вызывать в начале request handler'а до auth.
 */
export function isHealthCheckRequest(req: IncomingMessage): boolean {
  return req.method === 'GET' && req.url === '/health'
}
