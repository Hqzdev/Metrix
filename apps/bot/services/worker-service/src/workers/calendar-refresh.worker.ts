import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import { QUEUE_NAMES, createCalendarRefreshQueue, type CalendarRefreshJobData } from '../queues.js'
import type { WorkerLogger } from '../logger.js'

// Обновляем токен за 5 минут до истечения.
const REFRESH_BUFFER_MS = 5 * 60 * 1_000

// Переставляем следующий refresh-job за час до нового истечения.
const RESCHEDULE_BUFFER_MS = 60 * 60 * 1_000

/**
 * Worker для обновления OAuth-токенов Google Calendar.
 *
 * Проблема: accessToken истекает через ~1 час. Если обновление происходит
 * в request path (при создании бронирования) — это synchronous latency + failure risk.
 *
 * Решение: при первом подключении calendar-service ставит delayed job на refreshAt.
 * Worker обновляет токен в фоне и ставит следующий job на новое время истечения.
 * Booking flow никогда не ждёт token refresh.
 */
export function startCalendarRefreshWorker(
  connection: Redis,
  prisma: PrismaClient,
  calendarServiceUrl: string,
  calendarSigningSecret: string,
  logger: WorkerLogger,
): Worker<CalendarRefreshJobData> {
  // Queue нужна, чтобы worker мог поставить следующий refresh job.
  const queue = createCalendarRefreshQueue(connection)

  const worker = new Worker<CalendarRefreshJobData>(
    QUEUE_NAMES.CALENDAR_REFRESH,
    async (job) => {
      // connectionId указывает на CalendarConnection в базе.
      const { connectionId, telegramUserId, provider } = job.data

      logger.info({
        message: 'Refreshing calendar token',
        service: 'worker-service',
        connectionId,
        provider,
        telegramUserId,
      })

      // Проверяем, что подключение ещё существует.
      const conn = await prisma.calendarConnection.findUnique({ where: { id: connectionId } })
      if (!conn) {
        logger.warn({
          message: 'Calendar connection not found, skipping refresh',
          service: 'worker-service',
          connectionId,
        })
        return
      }

      // Token уже свежий — пересчитываем следующий refresh и выходим.
      if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS) {
        await scheduleNextRefresh(queue, job.data, conn.expiresAt)
        return
      }

      // Вызываем calendar-service для обновления токена.
      const body = JSON.stringify({ connectionId, provider })
      const response = await fetch(`${calendarServiceUrl}/tokens/refresh`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-name': 'worker-service',
          'x-signing-secret': calendarSigningSecret,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })

      // Если calendar-service не смог обновить token, job упадёт и будет retry.
      if (!response.ok) {
        throw new Error(`calendar-service token refresh failed: ${response.status}`)
      }

      // Если вернулся expiresAt, ставим следующий refresh.
      const result = (await response.json()) as { expiresAt?: string }
      if (result.expiresAt) {
        await scheduleNextRefresh(queue, job.data, new Date(result.expiresAt))
      }

      logger.info({
        message: 'Calendar token refreshed, next job scheduled',
        service: 'worker-service',
        connectionId,
      })
    },
    { connection, concurrency: 5 },
  )

  // Логируем падения refresh jobs.
  worker.on('failed', (job, err) => {
    logger.error({
      message: 'Calendar refresh job failed',
      service: 'worker-service',
      jobId: job?.id,
      connectionId: job?.data.connectionId,
      error: { name: err.name, message: err.message },
    })
  })

  return worker
}

async function scheduleNextRefresh(
  queue: ReturnType<typeof createCalendarRefreshQueue>,
  data: CalendarRefreshJobData,
  expiresAt: Date,
): Promise<void> {
  // Планируем refresh за RESCHEDULE_BUFFER_MS до истечения token.
  const fireAt = expiresAt.getTime() - RESCHEDULE_BUFFER_MS
  // delay не должен быть отрицательным.
  const delay = Math.max(0, fireAt - Date.now())
  await queue.add('refresh', data, { delay, removeOnComplete: true, removeOnFail: 100 })
}
