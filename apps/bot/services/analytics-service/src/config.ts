import type { TrustedCaller } from '@metrix/auth'

const DEFAULT_ANALYTICS_SERVICE_PORT = 3005
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

export type AnalyticsServiceConfig = {
  bookingServiceUrl: string
  port: number
  redisUrl: string
  signingSecret: string
  trustedCallers: TrustedCaller[]
}

/**
 * Читает и валидирует конфигурацию analytics-service при старте.
 *
 * Сервис ходит в booking-service от имени analytics-service, поэтому signing
 * secret обязателен и не должен иметь silent fallback.
 */
export function readAnalyticsServiceConfig(env: NodeJS.ProcessEnv): AnalyticsServiceConfig {
  return {
    bookingServiceUrl: env.BOOKING_SERVICE_URL ?? DEFAULT_BOOKING_SERVICE_URL,
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    signingSecret: requireEnv(env, 'ANALYTICS_SIGNING_SECRET'),
    trustedCallers: [
      { name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') },
      { name: 'admin-service', secret: readTrustedSecrets(env, 'TRUSTED_ADMIN_SECRET') },
    ],
  }
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') return DEFAULT_ANALYTICS_SERVICE_PORT

  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Возвращает обязательную переменную окружения или падает при пустом значении.
 */
function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}

function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
