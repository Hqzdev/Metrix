import { toJsonObject } from './json.js'
import type { AuditLogInput, AuditPrismaClient } from './types.js'

/**
 * Пишет audit-событие в PostgreSQL.
 *
 * Функция не знает о доменной логике.
 * Сервис сам решает, является ли ошибка audit log блокирующей.
 */
export async function writeAuditLog(prisma: AuditPrismaClient, input: AuditLogInput): Promise<void> {
  // Преобразуем обычный number user id в BigInt для Prisma schema.
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId === undefined ? undefined : BigInt(input.actorUserId),
      callerService: input.callerService,
      entityId: input.entityId,
      entityType: input.entityType,
      payload: input.payload === undefined ? undefined : toJsonObject(input.payload),
      requestId: input.requestId,
      service: input.service,
      ts: input.ts ? new Date(input.ts) : undefined,
    },
  })
}
