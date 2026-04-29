import type { AvailableSlot } from './booking-service.js'

// создаёт три временных слота на сегодня для ресурса
export function createSlots(resourceId: string): AvailableSlot[] {
  const today = new Date()
  today.setMinutes(0, 0, 0)

  return [
    createSlot(resourceId, 'm', today, 9, 12),
    createSlot(resourceId, 'a', today, 13, 17),
    createSlot(resourceId, 'e', today, 18, 21),
  ]
}

// создаёт один слот с заданными часами начала и конца
function createSlot(resourceId: string, suffix: string, baseDate: Date, startHour: number, endHour: number): AvailableSlot {
  const startsAtDate = new Date(baseDate)
  startsAtDate.setHours(startHour, 0, 0, 0)
  const endsAtDate = new Date(baseDate)
  endsAtDate.setHours(endHour, 0, 0, 0)

  return {
    id: `${resourceId}${suffix}`,
    endsAt: formatSlotDate(endsAtDate),
    endsAtIso: endsAtDate.toISOString(),
    startsAt: formatSlotDate(startsAtDate),
    startsAtIso: startsAtDate.toISOString(),
  }
}

// форматирует дату слота в читаемый вид
function formatSlotDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date)
}
