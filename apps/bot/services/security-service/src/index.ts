import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { readSecurityServiceConfig } from './config.js'
import { SecurityServiceLogger } from './logger.js'
import { SecurityRouter } from './security-router.js'

// логгер создаём первым, чтобы видеть все предупреждения при старте
const logger = new SecurityServiceLogger()
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

// подключаем Redis до старта HTTP-сервера
await redis.connect()

// основной router обрабатывает все входящие запросы
const router = new SecurityRouter({ config, logger, prisma, redis })

const server = createServer(async (req, res) => {
  // readiness: проверяем PostgreSQL и Redis
  if (req.method === 'GET' && req.url === '/ready') {
    try {
      // проверяем PostgreSQL
      await prisma.$queryRaw`SELECT 1`
      // проверяем Redis
      await redis.ping()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (error) {
      logger.error({
        error,
        message: 'Readiness check провален',
        service: 'security-service',
      })
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false }))
    }
    return
  }

  // все остальные запросы идут в router
  await router.handle(req, res)
})

server.listen(config.port, () => {
  logger.info({
    message: `security-service запущен на порту :${config.port}`,
    port: config.port,
    service: 'security-service',
  })
})

// корректное завершение работы при получении сигналов остановки
async function shutdown(signal: string): Promise<void> {
  logger.info({
    message: `Получен сигнал ${signal}, завершаем работу`,
    service: 'security-service',
    signal,
  })

  // сначала останавливаем HTTP — не принимаем новые запросы
  server.close(async () => {
    try {
      // закрываем PostgreSQL connection pool
      await prisma.$disconnect()
      // закрываем Redis соединение
      redis.disconnect()
      logger.info({ message: 'security-service остановлен', service: 'security-service' })
      process.exit(0)
    } catch (error) {
      logger.error({ error, message: 'Ошибка при остановке сервиса', service: 'security-service' })
      process.exit(1)
    }
  })
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })
