type AuditPrismaClient = {
  auditLog: {
    create(input: {
      data: {
        action: string
        actorUserId?: bigint
        callerService?: string
        entityId?: string
        entityType?: string
        payload?: any
        requestId?: string
        service: string
        ts?: Date
      }
    }): Promise<unknown>
  }
}

export type AuditLogInput = {
  action: string
  actorUserId?: number
  callerService?: string
  entityId?: string
  entityType?: string
  payload?: Record<string, unknown>
  requestId?: string
  service: string
  ts?: string
}

/**
 * Пишет audit-событие в PostgreSQL.
 *
 * Функция не знает о доменной логике.
 * Сервис сам решает, является ли ошибка audit log блокирующей.
 */
export async function writeAuditLog(prisma: AuditPrismaClient, input: AuditLogInput): Promise<void> {
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

function toJsonObject(value: Record<string, unknown>): Record<string, any> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
}

function toJsonValue(value: unknown): any {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
  }

  return value
}
