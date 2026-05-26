// Порт health/webhook HTTP-сервера по умолчанию.
const DEFAULT_HEALTH_PORT = 3000
// Redis по умолчанию для локального запуска.
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

// Bot может получать Telegram updates двумя способами.
export type TelegramMode = 'polling' | 'webhook'

// URL внутренних сервисов, к которым ходит gateway.
export type ServiceUrls = {
  admin: string
  analytics: string
  booking: string
  calendar: string
  payment: string
}

// Полный runtime-конфиг bot-gateway.
export type BotGatewayConfig = {
  // Telegram id админов.
  adminTelegramIds: number[]
  // Порт health/webhook сервера. 
  healthPort: number
  // Redis для sessions, rate limit и update dedupe.
  redisUrl: string
  // URL внутренних микросервисов.
  serviceUrls: ServiceUrls
  // Секрет для подписи запросов gateway -> services.
  signingSecret: string
  // Токен Telegram бота.
  telegramBotToken: string
  // polling или webhook.
  telegramMode: TelegramMode
  // Secret token, который Telegram присылает в webhook header.
  telegramWebhookSecret: string
  // Public URL webhook endpoint-а.
  telegramWebhookUrl: string
  // Секрет для подписи Telegram user id в межсервисных запросах.
  userIdSigningSecret: string
}

/**
 * Читает и валидирует конфигурацию bot-gateway.
 *
 * Gateway является публичной границей системы, поэтому Telegram token и signing
 * secrets обязательны и не должны иметь silent fallback.
 */
export function readBotGatewayConfig(env: NodeJS.ProcessEnv): BotGatewayConfig {
  return {
    adminTelegramIds: parseAdminTelegramIds(env.ADMIN_TELEGRAM_IDS ?? ''),
    healthPort: readPort(env.HEALTH_PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    // Для локального запуска есть дефолтные localhost URL.
    serviceUrls: {
      admin: env.ADMIN_SERVICE_URL ?? 'http://localhost:3006',
      analytics: env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005',
      booking: env.BOOKING_SERVICE_URL ?? 'http://localhost:3001',
      calendar: env.CALENDAR_SERVICE_URL ?? 'http://localhost:3002',
      payment: env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003',
    },
    signingSecret: requireEnv(env, 'GATEWAY_SIGNING_SECRET'),
    telegramBotToken: requireEnv(env, 'TELEGRAM_BOT_TOKEN'),
    telegramMode: readTelegramMode(env.TELEGRAM_MODE),
    telegramWebhookSecret: readTelegramWebhookSecret(env.TELEGRAM_MODE, env.TELEGRAM_WEBHOOK_SECRET),
    telegramWebhookUrl: readTelegramWebhookUrl(env.TELEGRAM_MODE, env.TELEGRAM_WEBHOOK_URL),
    userIdSigningSecret: requireEnv(env, 'USER_ID_SIGNING_SECRET'),
  }
}

/**
 * Читает режим получения Telegram updates.
 */
function readTelegramMode(rawMode: string | undefined): TelegramMode {
  // По умолчанию используем polling: он проще для локальной разработки.
  if (rawMode === undefined || rawMode === '') return 'polling'
  if (rawMode === 'polling' || rawMode === 'webhook') return rawMode
  throw new Error('TELEGRAM_MODE must be polling or webhook')
}

/**
 * Читает webhook URL и требует его только в webhook mode.
 */
function readTelegramWebhookUrl(rawMode: string | undefined, rawUrl: string | undefined): string {
  // В polling mode URL не нужен.
  if (rawMode !== 'webhook') return rawUrl ?? ''
  if (rawUrl === undefined || rawUrl.trim() === '') {
    throw new Error('TELEGRAM_WEBHOOK_URL is required when TELEGRAM_MODE=webhook')
  }

  return rawUrl.trim()
}

/**
 * Читает webhook secret и требует его только в webhook mode.
 */
function readTelegramWebhookSecret(rawMode: string | undefined, rawSecret: string | undefined): string {
  // В polling mode Telegram не присылает webhook secret header.
  if (rawMode !== 'webhook') return rawSecret ?? ''
  if (rawSecret === undefined || rawSecret.trim() === '') {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_MODE=webhook')
  }

  return rawSecret.trim()
}

/**
 * Парсит строковое значение в валидный идентификатор.
 */
function parseAdminTelegramIds(value: string): number[] {
  // Пустой список означает, что админских пользователей нет.
  if (value.trim() === '') return []

  return value.split(',').map(parseAdminTelegramId)
}

/**
 * Парсит строковое значение в валидный идентификатор.
 */
function parseAdminTelegramId(value: string): number {
  // Каждый id должен быть положительным целым числом.
  const id = Number(value.trim())
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ADMIN_TELEGRAM_IDS must contain positive integer ids')
  }

  return id
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  // Если HEALTH_PORT не задан, используем дефолт.
  if (rawPort === undefined || rawPort === '') return DEFAULT_HEALTH_PORT

  // Env приходит строкой, поэтому явно парсим число.
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('HEALTH_PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Возвращает обязательную переменную окружения или падает при пустом значении.
 */
function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  // Пустые строки и пробелы не считаем валидным значением.
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}
