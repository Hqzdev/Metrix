import type { PrismaClient } from '@prisma/client'
import type { AdminServiceLogger } from './logger.js'

// Опции фоновой очистки: база, логгер и правила хранения audit log.
type StartAuditRetentionCleanupOptions = {
  // Как часто запускать очистку.
  intervalMs: number
  // Куда писать события успеха и ошибок.
  logger: AdminServiceLogger
  // Prisma-клиент для удаления записей из PostgreSQL.
  prisma: PrismaClient
  // Сколько дней записи считаются актуальными.
  retentionDays: number
}

/**
 * Запускает периодическую очистку audit log по retention window.
 */
export function startAuditRetentionCleanup(options: StartAuditRetentionCleanupOptions): () => void {
  // cleanup не ждёт завершения снаружи, потому что это фоновая задача.
  const cleanup = (): void => {
    // Ошибка очистки не должна ронять весь admin-service.
    void deleteExpiredAuditLogs(options).catch((error: unknown) => {
      options.logger.error({
        action: 'audit.retention.failed',
        error,
        message: 'Failed to cleanup expired audit logs',
        service: 'admin-service',
      })
    })
  }

  // Запускаем очистку сразу при старте, а не только через первый интервал.
  cleanup()
  // Потом повторяем её по расписанию.
  const interval = setInterval(cleanup, options.intervalMs)

  // Возвращаем функцию остановки, чтобы graceful shutdown мог убрать таймер.
  return () => {
    clearInterval(interval)
  }
}

/**
 * Удаляет audit log записи старше retention window.
 */
async function deleteExpiredAuditLogs(options: StartAuditRetentionCleanupOptions): Promise<void> {
  // cutoff — граница времени: всё старше неё можно удалить.
  const cutoff = new Date(Date.now() - options.retentionDays * 24 * 60 * 60 * 1000)
  // deleteMany удаляет сразу все устаревшие записи одним запросом.
  const result = await options.prisma.auditLog.deleteMany({
    where: {
      ts: {
        lt: cutoff,
      },
    },
  })

  // Логируем количество удалённых строк, чтобы можно было проверять работу retention.
  options.logger.info({
    action: 'audit.retention.cleaned',
    cutoff: cutoff.toISOString(),
    deletedCount: result.count,
    message: 'Expired audit logs cleaned',
    retentionDays: options.retentionDays,
    service: 'admin-service',
  })
}
