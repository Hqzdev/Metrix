import type { TrustedCaller } from '@metrix/auth'

// Дефолты для локального запуска.
const DEFAULT_PORT = 3003
const DEFAULT_REDIS_URL = 'redis://localhost:6379'
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_CURRENCY = 'RUB'

// Runtime-конфигурация payment-service.
export type PaymentServiceConfig = {
  // URL booking-service.
  bookingServiceUrl: string
  // Валюта Telegram invoice.
  currency: string
  // Секрет для подписи запросов в booking-service.
  paymentSigningSecret: string
  // HTTP-порт сервиса.
  port: number
  // Telegram provider token из BotFather Payments.
  providerToken: string
  // Откуда был прочитан provider token.
  providerTokenSource: string
  // Redis для событий и consumers.
  redisUrl: string
  // Сервисы, которым разрешено вызывать payment-service.
  trustedCallers: TrustedCaller[]
  // Секрет для проверки Telegram user id от gateway.
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
  // Без этого секрета payment-service не сможет создать booking после оплаты.
  const paymentSigningSecret = requireEnv(env, 'PAYMENT_SIGNING_SECRET')
  // Provider token может прийти из нового или legacy env.
  const tokenConfig = readProviderToken(env)

  return {
    bookingServiceUrl: env.BOOKING_SERVICE_URL ?? DEFAULT_BOOKING_SERVICE_URL,
    currency: env.PAYMENT_CURRENCY ?? DEFAULT_CURRENCY,
    paymentSigningSecret,
    port: readPort(env.PORT),
    providerToken: tokenConfig.value,
    providerTokenSource: tokenConfig.source,
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    // bot-gateway обязателен, admin-service optional для ручного recovery.
    trustedCallers: [
      { name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') },
      ...readOptionalTrustedCaller(env, 'admin-service', 'TRUSTED_ADMIN_SECRET'),
    ],
    userIdSigningSecret: env.USER_ID_SIGNING_SECRET ?? '',
  }
}

/**
 * Примерно определяет, что вместо Telegram provider token передали YooKassa API key.
 */
export function isLikelyYooKassaApiKey(value: string): boolean {
  return value.startsWith('test_') || value.startsWith('live_')
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  // Пустой PORT означает стандартный порт.
  if (rawPort === undefined || rawPort === '') return DEFAULT_PORT

  // Env всегда строка, поэтому парсим число.
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
  // Пустые строки считаем отсутствующим значением.
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

/**
 * Читает текущий и следующий trusted secret для ротации.
 */
function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}

/**
 * Читает provider token с поддержкой старого env имени.
 */
function readProviderToken(env: NodeJS.ProcessEnv): { source: string; value: string } {
  // Новое правильное имя переменной.
  const telegramToken = readOptionalEnv(env, 'TELEGRAM_PAYMENT_PROVIDER_TOKEN')
  if (telegramToken) return { source: 'TELEGRAM_PAYMENT_PROVIDER_TOKEN', value: telegramToken }

  // Legacy fallback оставлен, чтобы старые окружения не упали сразу.
  const legacyToken = readOptionalEnv(env, 'YOOKASSA_PROVIDER_TOKEN')
  if (legacyToken) return { source: 'YOOKASSA_PROVIDER_TOKEN', value: legacyToken }

  // Пустой token разрешаем, но index.ts выведет warning.
  return { source: 'not configured', value: '' }
}

/**
 * Добавляет optional trusted caller, если его secret настроен.
 */
function readOptionalTrustedCaller(env: NodeJS.ProcessEnv, callerName: string, name: string): TrustedCaller[] {
  const secret = readOptionalEnv(env, name)
  if (!secret) return []

  // Поддерживаем текущий и следующий secret.
  return [{ name: callerName, secret: [secret, readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value)) }]
}

/**
 * Возвращает optional env только если он заполнен.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
