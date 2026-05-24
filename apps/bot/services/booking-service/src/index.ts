import { createServer } from 'node:http'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { RedisBus, SlotLocker } from '@metrix/redis-bus'
import { BookingRouter } from './booking-router.js'
import { readBookingServiceConfig } from './config.js'
import { BookingServiceLogger } from './logger.js'
import { ReminderScheduler } from './reminder-scheduler.js'
import { BookingCompletionScheduler } from './booking-completion-scheduler.js'
import { seedDatabase } from './seed.js'

// Логгер нужен сразу при старте, чтобы писать ошибки и служебные события единым JSON-форматом.
const logger = new BookingServiceLogger()
// Конфиг читаем один раз из переменных окружения.
const config = readBookingServiceConfig(process.env)
// Prisma работает с основной PostgreSQL базой.
const prisma = new PrismaClient()
// RedisBus нужен для событий, replay-защиты и общих Redis-операций.
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
// Метрики собираются отдельно под именем booking-service.
const metrics = new MetricsRegistry('booking-service')

// До старта HTTP-сервера подключаемся к Redis.
await bus.connect()
// Заполняем базовые данные, если они ещё не созданы.
await seedDatabase(prisma, logger)

// SlotLocker ставит Redis-lock на конкретный слот, чтобы два пользователя не забронировали его одновременно.
const slotLocker = new SlotLocker(bus.getRedisClient())

// BullMQ требует отдельное Redis-соединение с maxRetriesPerRequest: null.
let reminderScheduler: ReminderScheduler | null = null
let completionScheduler: BookingCompletionScheduler | null = null
let bullRedis: Redis | null = null
try {
  // Это соединение используется только scheduler-ами BullMQ.
  bullRedis = new Redis(config.redisUrl, {
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
  // ReminderScheduler ставит напоминание перед началом бронирования.
  reminderScheduler = new ReminderScheduler(bullRedis)
  // CompletionScheduler автоматически завершает бронирование после окончания.
  completionScheduler = new BookingCompletionScheduler(bullRedis)
  logger.info({ message: 'ReminderScheduler and CompletionScheduler connected', service: 'booking-service' })
} catch (err) {
  // Scheduling не критичен для создания бронирования: логируем ошибку и продолжаем работу.
  logger.error({ message: 'Failed to init schedulers', service: 'booking-service', error: err })
}

// Router содержит HTTP-маршруты и основную бизнес-логику booking-service.
const router = new BookingRouter({
  bus,
  completionScheduler,
  config,
  logger,
  prisma,
  slotLocker,
  reminderScheduler,
})

const server = createServer(
  // Обёртка добавляет сбор метрик вокруг обычного HTTP handler-а.
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      // Endpoint для Prometheus-compatible метрик.
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      // Readiness проверяет, можно ли уже направлять трафик на сервис.
      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          // Проверяем PostgreSQL простым запросом.
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          // Проверяем Redis через общий bus.
          redis: async () => {
            await bus.ping()
          },
        })
        return
      }

      // Всё остальное обрабатывает BookingRouter.
      void router.handle(req, res)
    },
  }),
)

// Graceful shutdown закрывает подключения аккуратно при остановке процесса.
installGracefulShutdown({
  logger,
  resources: [
    // Закрываем PostgreSQL connection pool.
    async () => {
      await prisma.$disconnect()
    },
    // Закрываем RedisBus.
    async () => {
      await bus.disconnect()
    },
    // Закрываем отдельное BullMQ Redis-соединение, если оно было создано.
    async () => {
      await bullRedis?.quit()
    },
  ],
  server,
  service: 'booking-service',
})

// После настройки зависимостей запускаем HTTP-сервер.
server.listen(config.port, () => {
  logger.info({
    message: `booking-service listening on :${config.port}`,
    service: 'booking-service',
  })
})
