import type { TrustedCaller } from '@metrix/auth'

const DEFAULT_ADMIN_SERVICE_PORT = 3006
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_ANALYTICS_SERVICE_URL = 'http://localhost:3005'
const DEFAULT_PAYMENT_SERVICE_URL = 'http://localhost:3003'
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

export type AdminServiceConfig = {
  analyticsServiceUrl: string
  auditRetentionDays: number
  auditRetentionIntervalMs: number
  bookingServiceUrl: string
  paymentServiceUrl: string
  port: number
  redisUrl: string
  signingSecret: string
  trustedCallers: TrustedCaller[]
}

/**
 * Читает и валидирует runtime-конфигурацию при старте процесса.
 *
 * Admin-service подписывает привилегированные вызовы в downstream-сервисы.
 * Отсутствие секретов должно ломать старт, а не проявляться в runtime.
 */
export function readAdminServiceConfig(env: NodeJS.ProcessEnv): AdminServiceConfig {
  const signingSecret = requireEnv(env, 'ADMIN_SIGNING_SECRET')
  return {
    analyticsServiceUrl: env.ANALYTICS_SERVICE_URL ?? DEFAULT_ANALYTICS_SERVICE_URL,
    auditRetentionDays: readPositiveInteger(env.AUDIT_RETENTION_DAYS, 180, 'AUDIT_RETENTION_DAYS'),
    auditRetentionIntervalMs: readPositiveInteger(
      env.AUDIT_RETENTION_INTERVAL_MS,
      24 * 60 * 60 * 1000,
      'AUDIT_RETENTION_INTERVAL_MS',
    ),
    bookingServiceUrl: env.BOOKING_SERVICE_URL ?? DEFAULT_BOOKING_SERVICE_URL,
    paymentServiceUrl: env.PAYMENT_SERVICE_URL ?? DEFAULT_PAYMENT_SERVICE_URL,
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    signingSecret,
    trustedCallers: [{ name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') }],
  }
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') return DEFAULT_ADMIN_SERVICE_PORT

  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

function readPositiveInteger(rawValue: string | undefined, defaultValue: number, name: string): number {
  if (rawValue === undefined || rawValue === '') return defaultValue

  const value = Number(rawValue)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
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
