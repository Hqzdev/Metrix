import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { installGracefulShutdown } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { WorkerLogger } from './logger.js'
import { startReminderWorker } from './workers/reminder.worker.js'
import { startCalendarRefreshWorker } from './workers/calendar-refresh.worker.js'
import { startReportWorker } from './workers/report.worker.js'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const DATABASE_URL = process.env.DATABASE_URL
const CALENDAR_SERVICE_URL = process.env.CALENDAR_SERVICE_URL ?? 'http://calendar-service:3002'
const CALENDAR_SIGNING_SECRET = process.env.CALENDAR_SIGNING_SECRET ?? ''

if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

const logger = new WorkerLogger()
const prisma = new PrismaClient()

// BullMQ требует отдельный Redis-клиент (не из RedisBus)
// так как BullMQ управляет соединением иначе
const redisConnection = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // обязательно для BullMQ
  enableReadyCheck: false,
})

// RedisBus для публикации уведомлений
const bus = new RedisBus(REDIS_URL, undefined, { password: REDIS_PASSWORD })
await bus.connect()

// ─── Start Workers ────────────────────────────────────────────────────────────

const reminderWorker = startReminderWorker(redisConnection, bus, logger)
const calendarWorker = startCalendarRefreshWorker(
  redisConnection,
  prisma,
  CALENDAR_SERVICE_URL,
  CALENDAR_SIGNING_SECRET,
  logger,
)
const reportWorker = startReportWorker(redisConnection, prisma, bus, logger)

logger.info({
  message: 'worker-service started',
  service: 'worker-service',
  workers: ['reminders', 'calendar-refresh', 'reports'],
})

installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await Promise.all([
        reminderWorker.close(),
        calendarWorker.close(),
        reportWorker.close(),
      ])
    },
    async () => {
      await bus.disconnect()
    },
    async () => {
      await prisma.$disconnect()
    },
    async () => {
      redisConnection.disconnect()
    },
  ],
  service: 'worker-service',
})
