import { createServer } from 'node:http'
import { startAuditRetentionCleanup } from '@metrix/audit-log'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { AdminRouter } from './admin-router.js'
import { readAdminServiceConfig } from './config.js'
import { logger } from './logger.js'
import { createSignedHttpClient } from './signed-http-client.js'

// Логгер создаём первым, чтобы любые ошибки старта можно было вывести в одном формате.
// Конфиг читается из переменных окружения один раз при запуске сервиса.
const config = readAdminServiceConfig(process.env)
// Prisma отвечает за работу с PostgreSQL.
const prisma = new PrismaClient()
// Redis нужен для защиты от повторных запросов и чтения DLQ-очередей.
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
// Метрики собираются под именем сервиса, чтобы их было легко отличать в мониторинге.
const metrics = new MetricsRegistry('admin-service')
 
// Подключаемся к Redis до старта HTTP-сервера, чтобы не принимать запросы в полурабочем состоянии.
await redis.connect()

// Router содержит всю бизнес-логику HTTP endpoint-ов admin-service.
const router = new AdminRouter({
  config,
  httpClient: createSignedHttpClient(config.signingSecret),
  logger,
  prisma,
  redis,
})
// Фоновая задача регулярно удаляет старые audit log записи.
const stopAuditRetentionCleanup = startAuditRetentionCleanup({
  intervalMs: config.auditRetentionIntervalMs,
  logger,
  prisma,
  retentionDays: config.auditRetentionDays,
})

const server = createServer(
  // Обёртка добавляет наблюдаемость: считает метрики и не смешивает это с бизнес-кодом.
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      // Prometheus или другой сборщик метрик забирает данные с этого endpoint-а.
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      // Readiness показывает, готов ли сервис принимать трафик прямо сейчас.
      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          // Проверяем, что PostgreSQL отвечает на простой запрос.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // Проверяем, что Redis жив и доступен.
          redis: async () => {
            await redis.ping()
          },
        })
        return
      }

      // Все остальные запросы передаём основному admin-router.
      void router.handle(req, res)
    },
  }),
)

// Graceful shutdown аккуратно закрывает сервер и внешние подключения при остановке процесса.
installGracefulShutdown({
  logger,
  resources: [
    // Останавливаем таймер фоновой очистки audit log.
    async () => {
      stopAuditRetentionCleanup()
    },
    // Закрываем Redis-соединение без резкого обрыва.
    async () => {
      await redis.quit()
    },
    // Закрываем пул соединений Prisma/PostgreSQL.
    async () => {
      await prisma.$disconnect()
    },
  ],
  server,
  service: 'admin-service',
})

// После настройки всех зависимостей начинаем слушать HTTP-порт.
server.listen(config.port, () => {
  logger.info({
    message: `admin-service listening on :${config.port}`,
    service: 'admin-service',
  })
})
