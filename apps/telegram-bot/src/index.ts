import { createBot } from './bot/create-bot.js'
import { CalendarIntegrationService } from './integrations/calendar/calendar-integration-service.js'
import { readEnv } from './lib/env.js'
import { ConsoleLogger } from './lib/logger.js'
import { FileBookingService } from './services/mock-booking-service.js'
import { TelegramClient } from './lib/telegram-client.js'

const logger = new ConsoleLogger()
const env = readEnv()
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

bot.start().catch((error: unknown) => {
  logger.error('Telegram bot failed to start', { error })
  process.exitCode = 1
})
