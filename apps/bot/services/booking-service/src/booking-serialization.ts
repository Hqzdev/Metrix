import type { Booking } from '@metrix/contracts'

// Форма записи booking, как она приходит из Prisma или похожего источника.
export type BookingRecord = {
  // ID события в Google Calendar, если оно было создано.
  calendarEventGoogle: string | null
  // ID события в Microsoft Calendar, если оно было создано.
  calendarEventMicrosoft: string | null
  // Человекочитаемое время окончания, например "15:00".
  endsAt: string
  // Машиночитаемое время окончания.
  endsAtIso: Date | string
  // Уникальный id бронирования.
  id: string
  // Локация, где находится ресурс.
  locationId: string
  // Название локации для UI и сообщений.
  locationName: string
  // Сколько уже оплачено в минимальных единицах валюты.
  paidAmountMinorUnits: number
  // Строка цены для отображения пользователю.
  priceLabel: string
  // ID ресурса, например комнаты.
  resourceId: string
  // Название ресурса для UI и сообщений.
  resourceName: string
  // ID выбранного временного слота.
  slotId: string
  // Человекочитаемое время начала.
  startsAt: string
  // Машиночитаемое время начала.
  startsAtIso: Date | string
  // Текущий статус бронирования.
  status: string
  // Telegram user id в Prisma может быть BigInt.
  telegramUserId: bigint | number
}

/**
 * Преобразует Prisma booking row в контракт, безопасный для JSON.
 *
 * BigInt и Date нельзя отдавать наружу напрямую, поэтому сериализация держится
 * в одном месте и не размазывается по route handlers.
 */
export function serializeBooking(booking: BookingRecord): Booking {
  return {
    ...booking,
    // null превращаем в undefined, чтобы внешний контракт не отдавал пустые calendar ids.
    calendarEventGoogle: booking.calendarEventGoogle ?? undefined,
    calendarEventMicrosoft: booking.calendarEventMicrosoft ?? undefined,
    // Date приводим к ISO-строке, потому что JSON не хранит Date-объекты.
    endsAtIso: booking.endsAtIso instanceof Date ? booking.endsAtIso.toISOString() : String(booking.endsAtIso),
    startsAtIso: booking.startsAtIso instanceof Date ? booking.startsAtIso.toISOString() : String(booking.startsAtIso),
    // Здесь приводим строку Prisma к union type из contracts.
    status: booking.status as Booking['status'],
    // BigInt нельзя сериализовать в JSON, поэтому превращаем user id в number.
    telegramUserId: Number(booking.telegramUserId),
  }
}
