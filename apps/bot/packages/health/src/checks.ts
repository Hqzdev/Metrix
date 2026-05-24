import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import type { HealthDependencyResult } from './types.js'

export async function checkDb(prisma: PrismaClient, timeout: number): Promise<HealthDependencyResult> {
  // latency считаем от начала проверки.
  const start = Date.now()
  try {
    // Promise.race добавляет timeout к Prisma query.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function checkRedis(redis: Redis, timeout: number): Promise<HealthDependencyResult> {
  // latency считаем от начала ping.
  const start = Date.now()
  try {
    // Promise.race добавляет timeout к Redis ping.
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}
