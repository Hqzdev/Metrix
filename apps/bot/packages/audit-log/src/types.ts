// JSON-значение, которое безопасно сохранять в payload audit log.
export type JsonSafeValue = string | number | boolean | null | JsonSafeValue[] | { [key: string]: JsonSafeValue }

// Минимальная часть PrismaClient, которая нужна audit-log package.
export type AuditPrismaClient = {
  auditLog: {
    create(input: any): Promise<unknown>
    deleteMany(input: any): Promise<{ count: number }>
    findMany(input: any): Promise<AuditLogRow[]>
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

export type AuditLogWhere = {
  action?: string
  entityId?: string
  entityType?: string
  requestId?: string
  service?: string
  ts?: {
    gte?: Date
    lte?: Date
    lt?: Date
  }
  OR?: Array<{ ts: { lt: Date } } | { id: { lt: string }; ts: Date }>
}

export type AuditLogRow = {
  action: string
  actorUserId: bigint | null
  callerService: string | null
  entityId: string | null
  entityType: string | null
  id: string
  payload: unknown
  requestId: string | null
  service: string
  ts: Date
}

export type AuditLogListResult = {
  items: Array<{
    action: string
    actorUserId: string | null
    callerService: string | null
    entityId: string | null
    entityType: string | null
    id: string
    payload: unknown
    requestId: string | null
    service: string
    ts: string
  }>
  limit: number
  nextCursor: string | null
}

export type AuditRetentionLogger = {
  error(entry: Record<string, unknown>): void
  info(entry: Record<string, unknown>): void
}
