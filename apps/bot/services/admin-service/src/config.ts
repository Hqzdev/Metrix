import type { TrustedCaller } from '@metrix/auth'

// Значения по умолчанию нужны для локального запуска без длинного .env.
const DEFAULT_ADMIN_SERVICE_PORT = 3006
const DEFAULT_BOOKING_SERVICE_URL = 'http://localhost:3001'
const DEFAULT_ANALYTICS_SERVICE_URL = 'http://localhost:3005'
const DEFAULT_PAYMENT_SERVICE_URL = 'http://localhost:3003'
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

// Полный набор настроек, которые нужны admin-service во время работы.
export type AdminServiceConfig = {
  // URL analytics-service: туда уходит чтение статистики и создание отчётов.
  analyticsServiceUrl: string
  // Сколько дней хранить audit log перед автоматической очисткой.
  auditRetentionDays: number
  // Как часто запускать очистку старых audit log записей.
  auditRetentionIntervalMs: number
  // URL booking-service: туда уходят операции с бронированиями, локациями и ресурсами.
  bookingServiceUrl: string
  // URL payment-service: туда уходят операции восстановления payment saga.
  paymentServiceUrl: string
  // HTTP-порт, на котором слушает admin-service.
  port: number
  // Адрес Redis для replay-защиты и DLQ.
  redisUrl: string
  // Секрет, которым admin-service подписывает исходящие запросы.
  signingSecret: string
  // Сервисы, которым разрешено вызывать admin-service.
  trustedCallers: TrustedCaller[]
}

/**
 * Читает и валидирует runtime-конфигурацию при старте процесса.
 *
 * Admin-service подписывает привилегированные вызовы в downstream-сервисы.
 * Отсутствие секретов должно ломать старт, а не проявляться в runtime.
 */
export function readAdminServiceConfig(env: NodeJS.ProcessEnv): AdminServiceConfig {
  // Без signing secret сервис не должен стартовать: иначе downstream-сервисы не доверят запросам.
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
    // Сейчас admin-service принимает привилегированные запросы только от bot-gateway.
    trustedCallers: [{ name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') }],
  }
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  // Если PORT не задан, используем стандартный порт сервиса.
  if (rawPort === undefined || rawPort === '') return DEFAULT_ADMIN_SERVICE_PORT

  // Number нужен, потому что переменные окружения всегда приходят строками.
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Читает положительное целое число из env или возвращает безопасное значение по умолчанию.
 */
function readPositiveInteger(rawValue: string | undefined, defaultValue: number, name: string): number {
  // Пустое значение означает "оставь дефолт".
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
  // trim защищает от значения из одних пробелов.
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

/**
 * Читает текущий и следующий секрет, чтобы можно было плавно ротировать ключи.
 */
function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}

/**
 * Возвращает optional env только если он реально заполнен.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
