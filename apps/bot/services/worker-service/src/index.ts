import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { installGracefulShutdown } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { WorkerLogger } from './logger.js'
import { startReminderWorker } from './workers/reminder.worker.js'
import { startCalendarRefreshWorker } from './workers/calendar-refresh.worker.js'
import { startReportWorker } from './workers/report.worker.js'
import { startCompletionWorker } from './workers/complete-booking.worker.js'

// Redis URL для BullMQ и RedisBus.
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
// Пароль Redis, если он настроен в окружении.
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
// Prisma требует DATABASE_URL.
const DATABASE_URL = process.env.DATABASE_URL
// Calendar-service нужен worker-у обновления токенов.
const CALENDAR_SERVICE_URL = process.env.CALENDAR_SERVICE_URL ?? 'http://calendar-service:3002'
// Секрет для подписи запросов worker -> calendar-service.
const CALENDAR_SIGNING_SECRET = process.env.CALENDAR_SIGNING_SECRET ?? ''

// Без базы worker не сможет читать и обновлять jobs-состояния.
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

// Логгер и Prisma общие для всех workers.
const logger = new WorkerLogger()
const prisma = new PrismaClient()

// BullMQ требует отдельный Redis-клиент (не из RedisBus),
// так как BullMQ управляет соединением иначе.
const redisConnection = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Обязательно для BullMQ.
  enableReadyCheck: false,
})

// RedisBus нужен workers для публикации уведомлений и событий.
const bus = new RedisBus(REDIS_URL, undefined, { password: REDIS_PASSWORD })
await bus.connect()

// Reminder worker отправляет напоминания перед началом брони.
const reminderWorker = startReminderWorker(redisConnection, prisma, bus, logger)
// Completion worker автоматически закрывает бронь после окончания.
const completionWorker = startCompletionWorker(redisConnection, prisma, bus, logger)
// Calendar worker обновляет OAuth access tokens.
const calendarWorker = startCalendarRefreshWorker(
  redisConnection,
  prisma,
  CALENDAR_SERVICE_URL,
  CALENDAR_SIGNING_SECRET,
  logger,
)
// Report worker генерирует отчёты в фоне.
const reportWorker = startReportWorker(redisConnection, prisma, bus, logger)

logger.info({
  message: 'worker-service started',
  service: 'worker-service',
  workers: ['reminders', 'booking-completions', 'calendar-refresh', 'reports'],
})

installGracefulShutdown({
  logger,
  resources: [
    // Сначала закрываем BullMQ workers.
    async () => {
      await Promise.all([
        reminderWorker.close(),
        completionWorker.close(),
        calendarWorker.close(),
        reportWorker.close(),
      ])
    },
    // Потом закрываем RedisBus.
    async () => {
      await bus.disconnect()
    },
    // Потом отключаем Prisma.
    async () => {
      await prisma.$disconnect()
    },
    // И в конце закрываем BullMQ Redis connection.
    async () => {
      redisConnection.disconnect()
    },
  ],
  service: 'worker-service',
})
