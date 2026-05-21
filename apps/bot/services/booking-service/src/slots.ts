import type { AvailableSlot } from '@metrix/contracts'

/**
 * Возвращает три стандартных слота (утро / день / вечер) для сегодняшнего дня.
 * Слоты используются в legacy-flow и остаются совместимы с существующими бронями.
 */
export function createSlots(resourceId: string): AvailableSlot[] {
  const today = new Date()
  today.setMinutes(0, 0, 0)
  return [
    makeSlot(resourceId, 'm', today, 9, 12),
    makeSlot(resourceId, 'a', today, 13, 17),
    makeSlot(resourceId, 'e', today, 18, 21),
  ]
}

/**
 * Генерирует стандартные слоты (утро / день / вечер) для произвольной даты.
 *
 * @param resourceId  идентификатор ресурса
 * @param dateStr     дата в формате YYYYMMDD
 */
export function createSlotsForDate(resourceId: string, dateStr: string): AvailableSlot[] {
  const base = parseDateStr(dateStr)
  if (!base) return []
  return [
    makeSlot(resourceId, `${dateStr}-m`, base, 9, 12),
    makeSlot(resourceId, `${dateStr}-a`, base, 13, 17),
    makeSlot(resourceId, `${dateStr}-e`, base, 18, 21),
  ]
}

/**
 * Строит один кастомный слот из resourceId + дата + час начала + продолжительность.
 *
 * Формат slotId: `{resourceId}-{YYYYMMDD}-{H}-{DUR}`
 * Пример:        `loc1-room-01-20260523-9-2`
 *
 * Возвращает null если slotId не соответствует кастомному формату.
 */
export function parseCustomSlot(resourceId: string, slotId: string): AvailableSlot | null {
  // Суффикс после resourceId: "-YYYYMMDD-H-DUR"
  const prefix = `${resourceId}-`
  if (!slotId.startsWith(prefix)) return null
  const suffix = slotId.slice(prefix.length)

  // Разбиваем по последним двум дефисам: YYYYMMDD-H-DUR
  const lastDash = suffix.lastIndexOf('-')
  if (lastDash === -1) return null
  const durStr = suffix.slice(lastDash + 1)
  const rest = suffix.slice(0, lastDash)

  const midDash = rest.lastIndexOf('-')
  if (midDash === -1) return null
  const hourStr = rest.slice(midDash + 1)
  const dateStr = rest.slice(0, midDash)

  if (!/^\d{8}$/.test(dateStr)) return null

  const hour = parseInt(hourStr, 10)
  const duration = parseInt(durStr, 10)

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
  if (!Number.isInteger(duration) || duration < 1 || duration > 8) return null
  if (hour + duration > 24) return null

  const base = parseDateStr(dateStr)
  if (!base) return null

  const start = new Date(base)
  start.setHours(hour, 0, 0, 0)
  const end = new Date(base)
  end.setHours(hour + duration, 0, 0, 0)

  return {
    id: slotId,
    startsAt: fmt(start),
    startsAtIso: start.toISOString(),
    endsAt: fmt(end),
    endsAtIso: end.toISOString(),
  }
}

/**
 * Строит slotId для кастомного слота из компонентов.
 * Дублируется здесь для локального использования внутри booking-service.
 * Публичный контракт живёт в @metrix/contracts.
 */
export function buildCustomSlotId(resourceId: string, dateStr: string, hour: number, duration: number): string {
  return `${resourceId}-${dateStr}-${hour}-${duration}`
}

// ─── internal helpers ────────────────────────────────────────────────────────

function makeSlot(resourceId: string, suffix: string, base: Date, startH: number, endH: number): AvailableSlot {
  const s = new Date(base)
  s.setHours(startH, 0, 0, 0)
  const e = new Date(base)
  e.setHours(endH, 0, 0, 0)
  return {
    id: `${resourceId}${suffix}`,
    startsAt: fmt(s),
    startsAtIso: s.toISOString(),
    endsAt: fmt(e),
    endsAtIso: e.toISOString(),
  }
}

function parseDateStr(dateStr: string): Date | null {
  if (!/^\d{8}$/.test(dateStr)) return null
  const year = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(4, 6), 10) - 1
  const day = parseInt(dateStr.slice(6, 8), 10)
  const d = new Date(year, month, day, 0, 0, 0, 0)
  if (isNaN(d.getTime())) return null
  return d
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('ru', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short' }).format(d)
}
