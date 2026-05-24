import type { TrustedCaller } from '@metrix/auth'

// Дефолты нужны для локального запуска.
const DEFAULT_ANALYTICS_SERVICE_PORT = 3005
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

// Runtime-конфигурация analytics-service.
export type AnalyticsServiceConfig = {
  // URL booking-service, откуда берём список бронирований.
  bookingServiceUrl: string
  // HTTP-порт analytics-service.
  port: number
  // Redis для consumers и replay-защиты.
  redisUrl: string
  // Секрет, которым analytics-service подписывает исходящие запросы.
  signingSecret: string
  // Сервисы, которым разрешено вызывать analytics-service.
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
    // Без signing secret сервис не сможет безопасно ходить в booking-service.
    signingSecret: requireEnv(env, 'ANALYTICS_SIGNING_SECRET'),
    // Обычно analytics-service вызывают bot-gateway и admin-service.
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
  // Если PORT не задан, используем стандартный порт.
  if (rawPort === undefined || rawPort === '') return DEFAULT_ANALYTICS_SERVICE_PORT

  // Env приходит строкой, поэтому явно парсим число.
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
  // Пустые строки и строки из пробелов считаем отсутствующим значением.
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

/**
 * Читает основной и следующий trusted secret для ротации ключей.
 */
function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}

/**
 * Возвращает optional env только если он не пустой.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
