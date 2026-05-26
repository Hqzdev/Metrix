import { STREAMS } from '@metrix/contracts'
import { MetricsRegistry, installGracefulShutdown } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { readNotificationServiceConfig, REPORTS_DIR } from './config.js'
import { logger } from './logger.js'
import { startNotificationConsumer } from './notification-consumer.js'
import { TelegramClient } from './telegram-client.js'

// Логгер создаём первым, чтобы видеть события старта и ошибки.
// Конфиг содержит Redis URL и Telegram Bot API URL.
const config = readNotificationServiceConfig(process.env)
// Метрики собираются отдельно под именем notification-service.
const metrics = new MetricsRegistry('notification-service')

// RedisBus слушает события, которые нужно отправить пользователю.
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
// До регистрации consumer-а подключаемся к Redis.
await bus.connect()

// При остановке процесса аккуратно закрываем Redis.
installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await bus.disconnect()
    },
  ],
  service: 'notification-service',
})

// TelegramClient инкапсулирует все вызовы Telegram Bot API.
const telegram = new TelegramClient({
  baseUrl: config.telegramBaseUrl,
  logger,
  reportsDir: REPORTS_DIR,
})

await startNotificationConsumer({ bus, logger, metrics, telegram })

// Финальный лог показывает, что consumer успешно стартовал.
logger.info({
  message: `notification-service started, consuming stream: ${STREAMS.NOTIFICATION_SEND}`,
  service: 'notification-service',
})
