import { setDefaultResultOrder } from 'node:dns'
import { createBot } from './bot/create-bot.js'
import { CalendarIntegrationService } from './integrations/calendar/calendar-integration-service.js'
import { readEnv } from './lib/env.js'
import { startHealthServer } from './lib/health-server.js'
import { ConsoleLogger } from './lib/logger.js'
import { TelegramClient } from './lib/telegram-client.js'
import { startUptimeMonitor } from './lib/uptime-monitor.js'
import { FileBookingService } from './services/mock-booking-service.js'

const startedAt = new Date()
setDefaultResultOrder('ipv4first')
const env = readEnv()
const logger = new ConsoleLogger(env.logLevel)
const telegram = new TelegramClient({ token: env.telegramBotToken })
const bookingService = new FileBookingService()
const calendarIntegration = new CalendarIntegrationService({
  bookingService,
  env: env.calendar,
  logger,
})
const bot = createBot({
  adminTelegramIds: env.adminTelegramIds,
  bookingService,
  calendarIntegration,
  logger,
  payment: {
    currency: env.paymentCurrency,
    providerToken: env.yookassaProviderToken,
  },
  telegram,
})

if (env.healthPort) {
  startHealthServer({ calendarIntegration, logger, port: env.healthPort, startedAt, telegram })
}

if (env.uptimeMonitorUrl) {
  startUptimeMonitor({ intervalMs: 60_000, logger, url: env.uptimeMonitorUrl })
}

bot.start().catch((error: unknown) => {
  logger.error('Telegram bot failed to start', { error })
  process.exitCode = 1
})
