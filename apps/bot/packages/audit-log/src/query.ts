import type { AuditLogListResult, AuditLogWhere, AuditPrismaClient } from './types.js'

// Cursor для постраничного чтения audit log.
type AuditCursor = {
  // id последней записи на предыдущей странице.
  id: string
  // timestamp той же записи.
  ts: Date
}

/**
 * Возвращает persistent audit log с ограниченным набором фильтров.
 */
export async function listAuditLogs(prisma: AuditPrismaClient, query: URLSearchParams): Promise<AuditLogListResult> {
  // limit ограничивает размер страницы, чтобы случайно не вернуть слишком много строк.
  const limit = parseLimit(query.get('limit'))
  // cursor позволяет читать следующую страницу без offset.
  const cursor = parseAuditCursor(query.get('cursor'))
  // where собирается из query-фильтров.
  const where = buildAuditLogWhere(query)
  // Берём на одну запись больше, чтобы понять, есть ли следующая страница.
  const rows = await prisma.auditLog.findMany({
    orderBy: [{ ts: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    where: {
      ...where,
      ...(cursor
        ? {
            OR: [
              { ts: { lt: cursor.ts } },
              { id: { lt: cursor.id }, ts: cursor.ts },
            ],
          }
        : {}),
    },
  })
  // Клиенту отдаём только limit записей.
  const pageRows = rows.slice(0, limit)
  // Если лишняя запись была, cursor строим по последней отданной строке.
  const nextRow = rows.length > limit ? pageRows[pageRows.length - 1] : undefined

  return {
    // BigInt и Date превращаем в строки, потому что JSON не умеет хранить их напрямую.
    items: pageRows.map((row) => ({
      action: row.action,
      actorUserId: row.actorUserId === null ? null : row.actorUserId.toString(),
      callerService: row.callerService,
      entityId: row.entityId,
      entityType: row.entityType,
      id: row.id,
      payload: row.payload,
      requestId: row.requestId,
      service: row.service,
      ts: row.ts.toISOString(),
    })),
    limit,
    nextCursor: nextRow ? encodeAuditCursor({ id: nextRow.id, ts: nextRow.ts }) : null,
  }
}

/**
 * Читает limit из query и ограничивает его безопасным максимумом.
 */
function parseLimit(value: string | null): number {
  // Если limit не передали, используем стандартную страницу на 50 элементов.
  if (value === null || value.trim() === '') return 50

  const parsed = Number(value)
  // Невалидный limit не роняет запрос, а возвращает дефолт.
  if (!Number.isInteger(parsed) || parsed < 1) return 50

  // Больше 100 за раз не отдаём, чтобы не перегружать сервис и UI.
  return Math.min(parsed, 100)
}

/**
 * Декодирует cursor из base64url JSON.
 */
function parseAuditCursor(value: string | null): AuditCursor | undefined {
  // Пустой cursor означает первую страницу.
  if (value === null || value.trim() === '') return undefined

  try {
    // Cursor приходит строкой, поэтому сначала декодируем base64url, потом JSON.
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { id?: unknown; ts?: unknown }
    if (typeof parsed.id !== 'string' || typeof parsed.ts !== 'string') return undefined

    // Дата должна быть валидной, иначе cursor игнорируем.
    const ts = new Date(parsed.ts)
    if (Number.isNaN(ts.getTime())) return undefined

    return { id: parsed.id, ts }
  } catch {
    return undefined
  }
}

/**
 * Кодирует cursor в строку, которую удобно передавать в query-параметре.
 */
function encodeAuditCursor(cursor: AuditCursor): string {
  // base64url безопасен для URL и не требует дополнительного encodeURIComponent.
  return Buffer.from(JSON.stringify({ id: cursor.id, ts: cursor.ts.toISOString() })).toString('base64url')
}

/**
 * Собирает Prisma where для фильтрации audit log.
 */
function buildAuditLogWhere(query: URLSearchParams): AuditLogWhere {
  // Объект заполняется только теми фильтрами, которые реально пришли в query.
  const where: AuditLogWhere = {}

  // Простые строковые фильтры: точное совпадение.
  setStringFilter(where, 'action', query.get('action'))
  setStringFilter(where, 'entityId', query.get('entityId'))
  setStringFilter(where, 'entityType', query.get('entityType'))
  setStringFilter(where, 'requestId', query.get('requestId'))
  setStringFilter(where, 'service', query.get('service'))

  const from = parseDateFilter(query.get('from'))
  const to = parseDateFilter(query.get('to'))

  // from/to превращаются в диапазон по timestamp.
  if (from || to) {
    where.ts = {}
    if (from) where.ts.gte = from
    if (to) where.ts.lte = to
  }

  return where
}

// Поля audit log, по которым разрешена строковая фильтрация.
type AuditLogStringFilter = 'action' | 'entityId' | 'entityType' | 'requestId' | 'service'

/**
 * Добавляет строковый фильтр, если query-параметр заполнен.
 */
function setStringFilter(target: Partial<Record<AuditLogStringFilter, string>>, key: AuditLogStringFilter, value: string | null): void {
  // Пустые значения пропускаем, чтобы Prisma не фильтровала по пустой строке.
  if (value === null || value.trim() === '') return
  target[key] = value.trim()
}

/**
 * Парсит дату из query-параметра.
 */
function parseDateFilter(value: string | null): Date | undefined {
  // Отсутствие даты просто означает отсутствие фильтра.
  if (value === null || value.trim() === '') return undefined

  const parsed = new Date(value)
  // Невалидные даты игнорируем, чтобы фильтр не ломал весь запрос.
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed
}
