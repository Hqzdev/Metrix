import { Worker } from 'bullmq'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { QUEUE_NAMES, type ReportJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'
import { parseReportJobData } from '../validation.js'

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
  reportsDir: string,
): Worker<ReportJobData> {
  // Гарантируем, что директория для отчётов существует.
  mkdirSync(reportsDir, { recursive: true })

  const worker = new Worker<ReportJobData>(
    QUEUE_NAMES.REPORTS,
    async (job) => {
      // Данные отчёта пришли из BullMQ job.
      const { reportId, type, chatId, dateFrom, dateTo } = parseReportJobData(job.data)

      logger.info({
        message: 'Generating report',
        service: 'worker-service',
        reportId,
        type,
      })

      // Помечаем как processing, чтобы UI видел, что работа началась.
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'processing', updatedAt: new Date() },
      })

      try {
        // Пока отчёт текстовый, но путь уже похож на будущий PDF/export файл.
        const filePath = join(reportsDir, `report-${reportId}.txt`)
        await generateReport({ type, filePath, prisma, dateFrom, dateTo })

        // После успешной генерации сохраняем путь к файлу.
        await prisma.report.update({
          where: { id: reportId },
          data: { status: 'done', filePath, updatedAt: new Date() },
        })

        // Просим notification-service отправить файл пользователю.
        await bus.publish(STREAMS.NOTIFICATION_SEND, {
          type: 'send_document',
          chatId,
          filePath,
          caption: `📊 Отчёт готов: ${type} ${dateFrom ?? ''} – ${dateTo ?? ''}`.trim(),
        })

        // Отдельное событие может использовать UI или аналитика.
        await bus.publish(STREAMS.REPORT_READY, { reportId, chatId, filePath })

        logger.info({
          message: 'Report generated and sent',
          service: 'worker-service',
          reportId,
          filePath,
        })
      } catch (err) {
        // Ошибку сохраняем в report, чтобы её было видно в админке.
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

  // Логируем падения report jobs.
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

  // Если задан период, фильтруем бронирования по startsAtIso.
  const where = dateFrom && dateTo
    ? { startsAtIso: { gte: new Date(dateFrom), lte: new Date(dateTo) } }
    : {}

  // Ограничиваем отчёт 500 последними бронями, чтобы файл не вырос бесконечно.
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Собираем простой текстовый документ.
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
    // Пишем файл stream-ом.
    const stream = createWriteStream(filePath)
    stream.write(lines.join('\n'), (err) => {
      if (err) reject(err)
      else stream.end(resolve)
    })
  })
}
