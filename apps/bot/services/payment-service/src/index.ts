import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { RedisBus } from '@metrix/redis-bus'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { isLikelyYooKassaApiKey, readPaymentServiceConfig } from './config.js'
import { logger } from './logger.js'
import { BookingServiceClient } from './booking-service-client.js'
import { PaymentRouter } from './payment-router.js'
import { startPaymentConsumer } from './payment-consumer.js'
import { startExpiredHoldCleaner } from './expired-hold-cleaner.js'

// Логгер создаём первым, чтобы видеть предупреждения конфигурации.
// Конфиг содержит Redis, валюту, provider token и service-to-service secrets.
const config = readPaymentServiceConfig(process.env)

// Без provider token Telegram invoice отправить нельзя, но сервис всё равно стартует для диагностики.
if (!config.providerToken) {
  logger.warn({
    action: 'payment.provider_token.missing',
    message: 'Telegram payment provider token is not configured',
    service: 'payment-service',
  })
} else if (isLikelyYooKassaApiKey(config.providerToken)) {
  // Частая ошибка: YooKassa API key похож на test_/live_, но Telegram ждёт provider token из BotFather.
  logger.warn({
    action: 'payment.provider_token.invalid_shape',
    message: 'Configured token looks like a YooKassa API key, but Telegram sendInvoice requires a BotFather provider token',
    providerTokenSource: config.providerTokenSource,
    service: 'payment-service',
  })
}

// Prisma хранит pending invoices, slot holds и payment saga.
const prisma = new PrismaClient()
// RedisBus публикует payment events и notification events.
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
// Подключаем Redis до старта consumers и HTTP-сервера.
await bus.connect()

// Клиент booking-service нужен для проверки ресурса/слота и создания booking после оплаты.
const bookingClient = new BookingServiceClient(config.bookingServiceUrl, config.paymentSigningSecret)
// Метрики payment-service.
const metrics = new MetricsRegistry('payment-service')

// Router принимает HTTP callbacks/commands, consumer обрабатывает PAYMENT_COMPLETED.
const router = new PaymentRouter({ bookingClient, bus, config, logger, prisma })
await startPaymentConsumer({ bookingClient, bus, logger, metrics, prisma })
// Фоновая очистка переводит старые holds в expired.
const expiredHoldCleaner = startExpiredHoldCleaner(prisma, logger)

const server = createServer(
  // Observability wrapper собирает HTTP-метрики.
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      // Endpoint для сбора метрик.
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }
      // Readiness проверяет базу и Redis.
      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          // Проверяем PostgreSQL.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // Проверяем RedisBus.
          redis: async () => {
            await bus.ping()
          },
        })
        return
      }
      // Остальные запросы передаём PaymentRouter.
      void router.handle(req, res)
    },
  }),
)

// Запускаем HTTP-сервер.
server.listen(config.port, () => {
  logger.info({ message: `payment-service listening on :${config.port}`, service: 'payment-service' })
})

// При остановке процесса закрываем таймер, Prisma и Redis.
installGracefulShutdown({
  logger,
  server,
  service: 'payment-service',
  resources: [
    // Останавливаем interval очистки hold-ов.
    async () => {
      clearInterval(expiredHoldCleaner)
    },
    // Закрываем PostgreSQL connection pool.
    async () => {
      await prisma.$disconnect()
    },
    // Закрываем RedisBus.
    async () => {
      await bus.disconnect()
    },
  ],
})
