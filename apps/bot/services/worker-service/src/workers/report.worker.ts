import { Worker } from 'bullmq'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type Redis from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { QUEUE_NAMES, type ReportJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'

const REPORTS_DIR = process.env.REPORTS_DIR ?? '/tmp/reports'

/**
 * Worker для генерации PDF-отчётов.
 *
 * Проблема: генерация PDF — тяжёлая CPU/IO операция (секунды).
 * Выполнять в request path = блокировать event loop, timeout у клиента.
 *
 * Решение: analytics-service создаёт Report запись (status=pending) и ставит job.
 * Worker генерирует PDF в фоне, обновляет status=done и шлёт файл через notification-service.
 *
 * Отчёт сохраняется на диск (или object storage) — notification-service читает файл
 * по пути и отправляет через Telegram sendDocument API.
 */
export function startReportWorker(
  connection: Redis,
  prisma: PrismaClient,
  bus: RedisBus,
  logger: WorkerLogger,
): Worker<ReportJobData> {
  mkdirSync(REPORTS_DIR, { recursive: true })

  const worker = new Worker<ReportJobData>(
    QUEUE_NAMES.REPORTS,
    async (job) => {
      const { reportId, type, chatId, dateFrom, dateTo } = job.data

      logger.info({
        message: 'Generating report',
        service: 'worker-service',
        reportId,
        type,
      })

      // помечаем как processing
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'processing', updatedAt: new Date() },
      })

      try {
        const filePath = join(REPORTS_DIR, `report-${reportId}.txt`)
        await generateReport({ type, filePath, prisma, dateFrom, dateTo })

        await prisma.report.update({
          where: { id: reportId },
          data: { status: 'done', filePath, updatedAt: new Date() },
        })

        await bus.publish(STREAMS.NOTIFICATION_SEND, {
          type: 'send_document',
          chatId,
          filePath,
          caption: `📊 Отчёт готов: ${type} ${dateFrom ?? ''} – ${dateTo ?? ''}`.trim(),
        })

        await bus.publish(STREAMS.REPORT_READY, { reportId, chatId, filePath })

        logger.info({
          message: 'Report generated and sent',
          service: 'worker-service',
          reportId,
          filePath,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await prisma.report.update({
          where: { id: reportId },
          data: { status: 'failed', error: message, updatedAt: new Date() },
        })
        throw err
      }
    },
    { connection, concurrency: 2 },
  )

  worker.on('failed', (job, err) => {
    logger.error({
      message: 'Report job failed',
      service: 'worker-service',
      jobId: job?.id,
      reportId: job?.data.reportId,
      error: { name: err.name, message: err.message },
    })
  })

  return worker
}

/**
 * Генерирует текстовый отчёт по аналитике.
 *
 * TODO: заменить на реальную PDF-генерацию через pdfkit или puppeteer.
 * Текстовый формат используется как placeholder — легко читается в Telegram
 * как документ и не требует дополнительных зависимостей.
 */
async function generateReport(opts: {
  type: string
  filePath: string
  prisma: PrismaClient
  dateFrom?: string
  dateTo?: string
}): Promise<void> {
  const { type, filePath, prisma, dateFrom, dateTo } = opts

  const where = dateFrom && dateTo
    ? { startsAtIso: { gte: new Date(dateFrom), lte: new Date(dateTo) } }
    : {}

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const lines: string[] = [
    `METRIX REPORT — ${type.toUpperCase()}`,
    `Generated: ${new Date().toISOString()}`,
    dateFrom && dateTo ? `Period: ${dateFrom} – ${dateTo}` : 'Period: all time',
    `Total bookings: ${bookings.length}`,
    `Active: ${bookings.filter((b) => b.status === 'active').length}`,
    `Cancelled: ${bookings.filter((b) => b.status === 'cancelled').length}`,
    `Rescheduled: ${bookings.filter((b) => b.status === 'rescheduled').length}`,
    '',
    '─'.repeat(60),
    '',
    ...bookings.slice(0, 100).map(
      (b) =>
        `[${b.status.toUpperCase()}] ${b.startsAt} | ${b.resourceName} | ${b.locationName} | user:${b.telegramUserId}`,
    ),
  ]

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(filePath)
    stream.write(lines.join('\n'), (err) => {
      if (err) reject(err)
      else stream.end(resolve)
    })
  })
}
