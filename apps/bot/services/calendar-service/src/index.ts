import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { Redis } from 'ioredis'
import { CalendarRouter } from './calendar-router.js'
import { readCalendarServiceConfig } from './config.js'
import { GoogleOAuthClient } from './google-oauth-client.js'
import { CalendarServiceLogger } from './logger.js'

// Логгер создаём первым, чтобы стартовые события были в одном формате.
const logger = new CalendarServiceLogger()
// Конфиг читает OAuth-настройки, Redis URL и секреты.
const config = readCalendarServiceConfig(process.env)

// Prisma хранит подключения календарей и зашифрованные токены.
const prisma = new PrismaClient()
// Redis используется для replay-защиты requestId.
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
// Метрики сервиса собираются под именем calendar-service.
const metrics = new MetricsRegistry('calendar-service')

// Подключаемся к Redis до старта HTTP-сервера.
await redis.connect()

// Клиент знает, как строить Google OAuth URL и обменивать code на tokens.
const googleOAuthClient = new GoogleOAuthClient({
  clientId: config.googleClientId,
  clientSecret: config.googleClientSecret,
  redirectUri: config.googleRedirectUri,
})

// Router содержит HTTP API calendar-service.
const router = new CalendarRouter({
  config,
  googleOAuthClient,
  logger,
  prisma,
  redis,
})

const server = createServer(
  // Обёртка добавляет метрики к HTTP handler-у.
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      // Endpoint для Prometheus-compatible метрик.
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      // Readiness проверяет PostgreSQL и Redis.
      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          // Проверяем, что база отвечает.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // Проверяем, что Redis отвечает.
          redis: async () => {
            await redis.ping()
          },
        })
        return
      }

      // Остальные запросы уходят в CalendarRouter.
      void router.handle(req, res)
    },
  }),
)

// При остановке процесса аккуратно закрываем внешние подключения.
installGracefulShutdown({
  logger,
  resources: [
    // Закрываем Prisma/PostgreSQL.
    async () => {
      await prisma.$disconnect()
    },
    // Закрываем Redis-соединение.
    async () => {
      await redis.quit()
    },
  ],
  server,
  service: 'calendar-service',
})

// Запускаем HTTP-сервер.
server.listen(config.port, () => {
  logger.info({
    message: `calendar-service listening on :${config.port}`,
    service: 'calendar-service',
  })
})
