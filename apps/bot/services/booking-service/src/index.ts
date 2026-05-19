import { createServer } from 'node:http'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { RedisBus, SlotLocker } from '@metrix/redis-bus'
import { BookingRouter } from './booking-router.js'
import { readBookingServiceConfig } from './config.js'
import { BookingServiceLogger } from './logger.js'
import { ReminderScheduler } from './reminder-scheduler.js'
import { seedDatabase } from './seed.js'

const logger = new BookingServiceLogger()
const config = readBookingServiceConfig(process.env)
const prisma = new PrismaClient()
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
const metrics = new MetricsRegistry('booking-service')

await bus.connect()
await seedDatabase(prisma, logger)

const slotLocker = new SlotLocker(bus.getRedisClient())

// BullMQ требует отдельное соединение с maxRetriesPerRequest: null
let reminderScheduler: ReminderScheduler | null = null
let reminderRedis: Redis | null = null
try {
  reminderRedis = new Redis(config.redisUrl, {
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
  reminderScheduler = new ReminderScheduler(reminderRedis)
  logger.info({ message: 'ReminderScheduler connected', service: 'booking-service' })
} catch (err) {
  // reminder scheduling не критично для работы сервиса — логируем и продолжаем
  logger.error({ message: 'Failed to init ReminderScheduler', service: 'booking-service', error: err })
}

const router = new BookingRouter({
  bus,
  config,
  logger,
  prisma,
  slotLocker,
  reminderScheduler,
})

const server = createServer(
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          redis: async () => {
            await bus.ping()
          },
        })
        return
      }

      void router.handle(req, res)
    },
  }),
)

installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await prisma.$disconnect()
    },
    async () => {
      await bus.disconnect()
    },
    async () => {
      await reminderRedis?.quit()
    },
  ],
  server,
  service: 'booking-service',
})

server.listen(config.port, () => {
  logger.info({
    message: `booking-service listening on :${config.port}`,
    service: 'booking-service',
  })
})
