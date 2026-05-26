import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { installGracefulShutdown } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { readWorkerServiceConfig } from './config.js'
import { logger } from './logger.js'
import { startReminderWorker } from './workers/reminder.worker.js'
import { startCalendarRefreshWorker } from './workers/calendar-refresh.worker.js'
import { startReportWorker } from './workers/report.worker.js'
import { startCompletionWorker } from './workers/complete-booking.worker.js'

// Логгер и Prisma общие для всех workers.
// Конфиг читаем один раз при старте.
const config = readWorkerServiceConfig(process.env)
const prisma = new PrismaClient()

// BullMQ требует отдельный Redis-клиент (не из RedisBus),
// так как BullMQ управляет соединением иначе.
const redisConnection = new Redis(config.redisUrl, {
  password: config.redisPassword,
  maxRetriesPerRequest: null, // Обязательно для BullMQ.
  enableReadyCheck: false,
})

// RedisBus нужен workers для публикации уведомлений и событий.
const bus = new RedisBus(config.redisUrl, undefined, { password: config.redisPassword })
await bus.connect()
 
// Reminder worker отправляет напоминания перед началом брони.
const reminderWorker = startReminderWorker(redisConnection, prisma, bus, logger)
// Completion worker автоматически закрывает бронь после окончания.
const completionWorker = startCompletionWorker(redisConnection, prisma, bus, logger)
// Calendar worker обновляет OAuth access tokens.
const calendarWorker = startCalendarRefreshWorker(
  redisConnection,
  prisma,
  config.calendarServiceUrl,
  config.calendarSigningSecret,
  logger,
)
// Report worker генерирует отчёты в фоне.
const reportWorker = startReportWorker(redisConnection, prisma, bus, logger, config.reportsDir)

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
