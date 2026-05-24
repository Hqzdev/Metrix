import { checkDb, checkRedis } from './checks.js'
import type { HealthCheckOptions, HealthCheckResult } from './types.js'

/**
 * Возвращает результат health check без HTTP — для встраивания в любой router.
 */
export async function runHealthChecks(opts: HealthCheckOptions, timeout = 3_000): Promise<HealthCheckResult> {
  // timeout можно передать в opts или вторым аргументом ради обратной совместимости.
  const dependencyTimeout = opts.timeout ?? timeout
  // checks заполняется только теми зависимостями, которые передали.
  const checks: HealthCheckResult['checks'] = {}
  let allOk = true

  // Проверка базы optional.
  if (opts.prisma) {
    const dbResult = await checkDb(opts.prisma, dependencyTimeout)
    checks.db = dbResult
    if (!dbResult.ok) allOk = false
  }

  // Проверка Redis optional.
  if (opts.redis) {
    const redisResult = await checkRedis(opts.redis, dependencyTimeout)
    checks.redis = redisResult
    if (!redisResult.ok) allOk = false
  }

  // uptime и timestamp помогают при отладке рестартов.
  return {
    ok: allOk,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  }
}
