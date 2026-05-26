import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { Redis } from 'ioredis'
import { readSecurityServiceConfig } from './config.js'
import { logger } from './logger.js'
import { SecurityRouter } from './security-router.js'

// логгер создаём первым, чтобы видеть все предупреждения при старте
// читаем конфиг из переменных окружения
const config = readSecurityServiceConfig(process.env)

// Prisma нужна для хранения сессий
const prisma = new PrismaClient()

// Redis нужен для blacklist токенов и rate limiter
const redis = new Redis(config.redisUrl, {
  // lazyConnect: true — подключение при первом запросе, не при старте
  lazyConnect: true,
  // maxRetriesPerRequest: 3 — быстрый ответ если Redis недоступен
  maxRetriesPerRequest: 3,
})

// Метрики собираются отдельно под именем security-service.
const metrics = new MetricsRegistry('security-service')

// подключаем Redis до старта HTTP-сервера
await redis.connect()

// основной router обрабатывает все входящие запросы
const router = new SecurityRouter({ config, logger, prisma, redis })
 
const server = createServer(
  // Observability wrapper собирает HTTP-метрики по всем endpoint-ам.
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
          // Проверяем PostgreSQL простым запросом.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // Проверяем Redis ping-ом.
          redis: async () => {
            await redis.ping()
          },
        })
        return
      }

      // Все остальные запросы идут в router.
      void router.handle(req, res)
    },
  }),
)

// Корректное завершение работы закрывает HTTP, PostgreSQL и Redis.
installGracefulShutdown({
  logger,
  resources: [
    // Закрываем PostgreSQL connection pool.
    async () => {
      await prisma.$disconnect()
    },
    // Закрываем Redis соединение после завершения HTTP traffic.
    async () => {
      redis.disconnect()
    },
  ],
  server,
  service: 'security-service',
})

server.listen(config.port, () => {
  logger.info({
    message: `security-service запущен на порту :${config.port}`,
    port: config.port,
    service: 'security-service',
  })
})
