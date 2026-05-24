// Минимальная часть PrismaClient, которая нужна для записи auditLog.
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

// Входные данные audit-события.
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

/**
 * Приводит payload к JSON-safe объекту.
 */
function toJsonObject(value: Record<string, unknown>): Record<string, any> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
}

/**
 * Приводит одно значение к виду, который можно сохранить в JSON колонку.
 */
function toJsonValue(value: unknown): any {
  // BigInt напрямую не сериализуется в JSON.
  if (typeof value === 'bigint') return value.toString()
  // Date сохраняем как ISO-строку.
  if (value instanceof Date) return value.toISOString()
  // Массивы обрабатываем рекурсивно.
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (value && typeof value === 'object') {
    // Вложенные объекты тоже приводим рекурсивно.
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]))
  }

  return value
}
