import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { AnalyticsRouter } from './analytics-router.js'
import { BookingClient } from './booking-client.js'
import { readAnalyticsServiceConfig } from './config.js'
import { registerAnalyticsEventConsumers } from './event-consumers.js'
import { logger } from './logger.js'

// Логгер создаём первым, чтобы события старта тоже были в JSON-формате.
// Конфиг читается из env один раз при запуске.
const config = readAnalyticsServiceConfig(process.env)
// Prisma нужен для хранения и чтения report-записей.
const prisma = new PrismaClient()
// RedisBus читает события booking.created/booking.cancelled и делает replay-защиту.
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
// Метрики сервиса идут под отдельным namespace.
const metrics = new MetricsRegistry('analytics-service')

// Подключаем Redis до регистрации consumers.
await bus.connect()
// Подписываемся на события бронирований, которые могут влиять на аналитику.
await registerAnalyticsEventConsumers(bus, logger, { metrics })
 
// Router принимает HTTP-запросы, а BookingClient ходит за фактами бронирований.
const router = new AnalyticsRouter({
  bookingClient: new BookingClient(config.bookingServiceUrl, config.signingSecret),
  bus,
  config,
  logger,
  prisma,
})

const server = createServer(
  // Observed handler добавляет метрики вокруг обычной HTTP-логики.
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      // Endpoint для сбора метрик.
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      // Readiness проверяет, готовы ли база и Redis.
      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          // PostgreSQL должен отвечать на простой запрос.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // RedisBus должен быть подключён.
          redis: async () => {
            await bus.ping()
          },
        })
        return
      }

      // Остальные запросы обрабатывает AnalyticsRouter.
      void router.handle(req, res)
    },
  }),
)

// Graceful shutdown закрывает внешние подключения при остановке процесса.
installGracefulShutdown({
  logger,
  resources: [
    // Закрываем Prisma/PostgreSQL.
    async () => {
      await prisma.$disconnect()
    },
    // Закрываем RedisBus и stream consumers.
    async () => {
      await bus.disconnect()
    },
  ],
  server,
  service: 'analytics-service',
})

// Запускаем HTTP-сервер после настройки всех зависимостей.
server.listen(config.port, () => {
  logger.info({
    message: `analytics-service listening on :${config.port}`,
    service: 'analytics-service',
  })
})
