const DEFAULT_HEALTH_PORT = 3000
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

export type TelegramMode = 'polling' | 'webhook'

export type ServiceUrls = {
  admin: string
  analytics: string
  booking: string
  calendar: string
  payment: string
}

export type BotGatewayConfig = {
  adminTelegramIds: number[]
  healthPort: number
  redisUrl: string
  serviceUrls: ServiceUrls
  signingSecret: string
  telegramBotToken: string
  telegramMode: TelegramMode
  telegramWebhookSecret: string
  telegramWebhookUrl: string
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

function readTelegramMode(rawMode: string | undefined): TelegramMode {
  if (rawMode === undefined || rawMode === '') return 'polling'
  if (rawMode === 'polling' || rawMode === 'webhook') return rawMode
  throw new Error('TELEGRAM_MODE must be polling or webhook')
}

function readTelegramWebhookUrl(rawMode: string | undefined, rawUrl: string | undefined): string {
  if (rawMode !== 'webhook') return rawUrl ?? ''
  if (rawUrl === undefined || rawUrl.trim() === '') {
    throw new Error('TELEGRAM_WEBHOOK_URL is required when TELEGRAM_MODE=webhook')
  }

  return rawUrl.trim()
}

function readTelegramWebhookSecret(rawMode: string | undefined, rawSecret: string | undefined): string {
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
  if (value.trim() === '') return []

  return value.split(',').map(parseAdminTelegramId)
}

/**
 * Парсит строковое значение в валидный идентификатор.
 */
function parseAdminTelegramId(value: string): number {
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
  if (rawPort === undefined || rawPort === '') return DEFAULT_HEALTH_PORT

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
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}
