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

// Node иногда предпочитает IPv6 localhost; для Docker/local проще сначала IPv4.
setDefaultResultOrder('ipv4first')

// Логгер и конфиг создаём в самом начале запуска.
const logger = new BotGatewayLogger()
const config = readBotGatewayConfig(process.env)
// Redis хранит offset Telegram updates, session state и rate limit.
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
// Метрики bot-gateway.
const metrics = new MetricsRegistry('bot-gateway')

// Подключаем Redis до старта polling/webhook.
await redis.connect()

// ServicesClient ходит во внутренние микросервисы с подписью.
const services = new ServicesClient(config.serviceUrls, {
  signing: config.signingSecret,
  userId: config.userIdSigningSecret,
})
// TelegramClient вызывает Telegram Bot API.
const telegram = new TelegramClient(config.telegramBotToken)
// Bot содержит всю логику команд, callback-кнопок и платежных updates.
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

// Health server также принимает Telegram webhook в webhook mode.
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

// Graceful shutdown останавливает bot и закрывает Redis.
installGracefulShutdown({
  logger,
  resources: [
    // Останавливаем polling loop.
    async () => {
      bot.stop()
    },
    // Закрываем Redis-соединение.
    async () => {
      await redis.quit()
    },
  ],
  server: healthServer,
  service: 'bot-gateway',
})

// В polling mode bot сам забирает updates через getUpdates.
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
    // В webhook mode регистрируем команды и webhook URL в Telegram.
    await Promise.all([
      telegram.setMyCommands(),
      telegram.setWebhook(config.telegramWebhookUrl, config.telegramWebhookSecret),
    ])
  } catch (error) {
    // Без webhook bot не сможет получать updates, поэтому завершаем процесс.
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
