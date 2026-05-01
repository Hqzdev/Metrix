import type { AvailableSlot } from '@metrix/contracts'

export function createSlots(resourceId: string): AvailableSlot[] {
  const today = new Date()
  today.setMinutes(0, 0, 0)
  return [
    makeSlot(resourceId, 'm', today, 9, 12),
    makeSlot(resourceId, 'a', today, 13, 17),
    makeSlot(resourceId, 'e', today, 18, 21),
  ]
}

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

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short' }).format(d)
}
