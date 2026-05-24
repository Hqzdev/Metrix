import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'

// Результат одной dependency-проверки.
export type HealthDependencyResult = {
  ok: boolean
  latencyMs?: number
  error?: string
}

// Полный ответ health check.
export type HealthCheckResult = {
  ok: boolean
  uptime: number
  timestamp: string
  checks: {
    db?: HealthDependencyResult
    redis?: HealthDependencyResult
  }
}

// Зависимости, которые health package умеет проверять.
export type HealthCheckOptions = {
  prisma?: PrismaClient
  redis?: Redis
  timeout?: number
}
