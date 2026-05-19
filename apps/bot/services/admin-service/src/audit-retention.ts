import type { PrismaClient } from '@prisma/client'
import type { AdminServiceLogger } from './logger.js'

type StartAuditRetentionCleanupOptions = {
  intervalMs: number
  logger: AdminServiceLogger
  prisma: PrismaClient
  retentionDays: number
}

/**
 * Запускает периодическую очистку audit log по retention window.
 */
export function startAuditRetentionCleanup(options: StartAuditRetentionCleanupOptions): () => void {
  const cleanup = (): void => {
    void deleteExpiredAuditLogs(options).catch((error: unknown) => {
      options.logger.error({
        action: 'audit.retention.failed',
        error,
        message: 'Failed to cleanup expired audit logs',
        service: 'admin-service',
      })
    })
  }

  cleanup()
  const interval = setInterval(cleanup, options.intervalMs)

  return () => {
    clearInterval(interval)
  }
}

async function deleteExpiredAuditLogs(options: StartAuditRetentionCleanupOptions): Promise<void> {
  const cutoff = new Date(Date.now() - options.retentionDays * 24 * 60 * 60 * 1000)
  const result = await options.prisma.auditLog.deleteMany({
    where: {
      ts: {
        lt: cutoff,
      },
    },
  })

  options.logger.info({
    action: 'audit.retention.cleaned',
    cutoff: cutoff.toISOString(),
    deletedCount: result.count,
    message: 'Expired audit logs cleaned',
    retentionDays: options.retentionDays,
    service: 'admin-service',
  })
}
