import type { TrustedCaller } from '@metrix/auth'

const DEFAULT_PORT = 3003
const DEFAULT_REDIS_URL = 'redis://localhost:6379'
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_CURRENCY = 'RUB'

export type PaymentServiceConfig = {
  bookingServiceUrl: string
  currency: string
  paymentSigningSecret: string
  port: number
  providerToken: string
  providerTokenSource: string
  redisUrl: string
  trustedCallers: TrustedCaller[]
  userIdSigningSecret: string
}

/**
 * Читает и валидирует конфигурацию при старте процесса.
 *
 * важно:
 * - paymentSigningSecret нужен для подписи запросов в booking-service.
 *   Его отсутствие означает, что созданные бронирования не будут авторизованы.
 * - TELEGRAM_PAYMENT_PROVIDER_TOKEN — это provider token из BotFather.
 *   Старый YOOKASSA_PROVIDER_TOKEN оставлен как fallback для совместимости.
 */
export function readPaymentServiceConfig(env: NodeJS.ProcessEnv): PaymentServiceConfig {
  const paymentSigningSecret = requireEnv(env, 'PAYMENT_SIGNING_SECRET')
  const tokenConfig = readProviderToken(env)

  return {
    bookingServiceUrl: env.BOOKING_SERVICE_URL ?? DEFAULT_BOOKING_SERVICE_URL,
    currency: env.PAYMENT_CURRENCY ?? DEFAULT_CURRENCY,
    paymentSigningSecret,
    port: readPort(env.PORT),
    providerToken: tokenConfig.value,
    providerTokenSource: tokenConfig.source,
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    trustedCallers: [
      { name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') },
      ...readOptionalTrustedCaller(env, 'admin-service', 'TRUSTED_ADMIN_SECRET'),
    ],
    userIdSigningSecret: env.USER_ID_SIGNING_SECRET ?? '',
  }
}

export function isLikelyYooKassaApiKey(value: string): boolean {
  return value.startsWith('test_') || value.startsWith('live_')
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') return DEFAULT_PORT

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

function readProviderToken(env: NodeJS.ProcessEnv): { source: string; value: string } {
  const telegramToken = readOptionalEnv(env, 'TELEGRAM_PAYMENT_PROVIDER_TOKEN')
  if (telegramToken) return { source: 'TELEGRAM_PAYMENT_PROVIDER_TOKEN', value: telegramToken }

  const legacyToken = readOptionalEnv(env, 'YOOKASSA_PROVIDER_TOKEN')
  if (legacyToken) return { source: 'YOOKASSA_PROVIDER_TOKEN', value: legacyToken }

  return { source: 'not configured', value: '' }
}

function readOptionalTrustedCaller(env: NodeJS.ProcessEnv, callerName: string, name: string): TrustedCaller[] {
  const secret = readOptionalEnv(env, name)
  if (!secret) return []

  return [{ name: callerName, secret: [secret, readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value)) }]
}

function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
