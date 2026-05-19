import type { TrustedCaller } from '@metrix/auth'

const DEFAULT_BOOKING_SERVICE_PORT = 3001
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

export type BookingServiceConfig = {
  port: number
  redisUrl: string
  trustedCallers: TrustedCaller[]
  userIdSigningSecret?: string
}

/**
 * Читает runtime-конфигурацию booking-service.
 *
 * Trusted secrets обязательны: сервис не должен стартовать в режиме, где все
 * внутренние запросы будут отвергаться или приниматься без явного trust boundary.
 */
export function readBookingServiceConfig(env: NodeJS.ProcessEnv): BookingServiceConfig {
  return {
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    trustedCallers: [
      { name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') },
      { name: 'payment-service', secret: readTrustedSecrets(env, 'TRUSTED_PAYMENT_SECRET') },
      { name: 'analytics-service', secret: readTrustedSecrets(env, 'TRUSTED_ANALYTICS_SECRET') },
      { name: 'admin-service', secret: readTrustedSecrets(env, 'TRUSTED_ADMIN_SECRET') },
    ],
    userIdSigningSecret: readOptionalEnv(env, 'USER_ID_SIGNING_SECRET'),
  }
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') return DEFAULT_BOOKING_SERVICE_PORT

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

/**
 * Возвращает непустую опциональную переменную окружения.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}

function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}
