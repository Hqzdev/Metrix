import type { LogLevel } from './logger.js'

export type BotEnv = {
  adminTelegramIds: number[]
  calendar: CalendarEnv
  healthPort: number | undefined
  logLevel: LogLevel
  paymentCurrency: string
  telegramBotToken: string
  uptimeMonitorUrl: string | undefined
  yookassaProviderToken: string
}

export type CalendarEnv = {
  encryptionSecret?: string
  google?: CalendarProviderEnv
  microsoft?: CalendarProviderEnv
}

export type CalendarProviderEnv = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// читает и валидирует переменные окружения
export function readEnv(): BotEnv {
  const adminTelegramIds = parseTelegramIds(process.env.ADMIN_TELEGRAM_IDS)
  const calendar = readCalendarEnv()
  const healthPort = parseOptionalPort(process.env.HEALTH_PORT)
  const logLevel = parseLogLevel(process.env.LOG_LEVEL)
  const paymentCurrency = process.env.PAYMENT_CURRENCY ?? 'USD'
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const uptimeMonitorUrl = process.env.UPTIME_MONITOR_URL
  const yookassaProviderToken = process.env.YOOKASSA_PROVIDER_TOKEN

  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required to start the Telegram bot.')
  }

  if (!yookassaProviderToken) {
    throw new Error('YOOKASSA_PROVIDER_TOKEN is required to accept payments through YooKassa.')
  }

  return {
    adminTelegramIds,
    calendar,
    healthPort,
    logLevel,
    paymentCurrency,
    telegramBotToken,
    uptimeMonitorUrl,
    yookassaProviderToken,
  }
}

function parseTelegramIds(value: string | undefined): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function readCalendarEnv(): CalendarEnv {
  return {
    encryptionSecret: process.env.CALENDAR_TOKEN_SECRET,
    google: readCalendarProviderEnv({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    }),
    microsoft: readCalendarProviderEnv({
      clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
      redirectUri: process.env.MICROSOFT_CALENDAR_REDIRECT_URI,
    }),
  }
}

function readCalendarProviderEnv(input: {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}): CalendarProviderEnv | undefined {
  if (!input.clientId || !input.clientSecret || !input.redirectUri) return undefined
  return { clientId: input.clientId, clientSecret: input.clientSecret, redirectUri: input.redirectUri }
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === 'warn' || value === 'error') return value
  return 'info'
}

function parseOptionalPort(value: string | undefined): number | undefined {
  if (!value) return undefined
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined
}
