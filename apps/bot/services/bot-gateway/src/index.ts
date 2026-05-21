import { setDefaultResultOrder } from 'node:dns'
import { installGracefulShutdown, MetricsRegistry } from '@metrix/observability'
import { Redis } from 'ioredis'
import { Bot } from './bot.js'
import { readBotGatewayConfig } from './config.js'
import { startHealthServer } from './health-server.js'
import { BotGatewayLogger } from './logger.js'
import { createRateLimiter } from './rate-limiter.js'
import { ServicesClient } from './services-client.js'
import { TelegramClient } from './telegram-client.js'
import { RedisTelegramUpdateStore } from './telegram-update-store.js'
import { RedisUserSessionStore } from './user-session-store.js'

setDefaultResultOrder('ipv4first')

const logger = new BotGatewayLogger()
const config = readBotGatewayConfig(process.env)
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
const metrics = new MetricsRegistry('bot-gateway')

await redis.connect()

const services = new ServicesClient(config.serviceUrls, {
  signing: config.signingSecret,
  userId: config.userIdSigningSecret,
})
const telegram = new TelegramClient(config.telegramBotToken)
const bot = new Bot({
  adminTelegramIds: config.adminTelegramIds,
  logger,
  metrics,
  rateLimit: createRateLimiter(redis),
  services,
  sessionStore: new RedisUserSessionStore(redis),
  telegram,
  updateStore: new RedisTelegramUpdateStore(redis),
})

const healthServer = startHealthServer({
  calendarServiceUrl: config.serviceUrls.calendar,
  logger,
  metrics,
  port: config.healthPort,
  readinessChecks: {
    redis: async () => {
      await redis.ping()
    },
  },
  signingSecret: config.signingSecret,
  telegramWebhookSecret: config.telegramWebhookSecret,
  webhookHandler: (update) => bot.handleWebhookUpdate(update),
})

installGracefulShutdown({
  logger,
  resources: [
    async () => {
      bot.stop()
    },
    async () => {
      await redis.quit()
    },
  ],
  server: healthServer,
  service: 'bot-gateway',
})

if (config.telegramMode === 'polling') {
  bot.start().catch((error: unknown) => {
    logger.error({
      error,
      message: 'Bot failed to start',
      service: 'bot-gateway',
    })
    process.exitCode = 1
  })
} else {
  try {
    await Promise.all([
      telegram.setMyCommands(),
      telegram.setWebhook(config.telegramWebhookUrl, config.telegramWebhookSecret),
    ])
  } catch (error) {
    logger.error({
      error,
      message: 'Failed to initialize Telegram webhook mode',
      service: 'bot-gateway',
    })
    process.exit(1)
  }
  logger.info({
    message: 'bot-gateway running in webhook mode',
    service: 'bot-gateway',
  })
}
