import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type {
  AdminLocationUpdate,
  AdminResourceUpdate,
  AvailableSlot,
  Booking,
  BookingLocation,
  BookingResource,
  BookingService,
} from './booking-service.js'
import { locations, normalizeBookingPrices, normalizeResourcePrices, resources } from './booking-seed.js'
import { createSlots } from './booking-slots.js'

type BookingStore = {
  bookingsByUserId: Record<string, Booking[]>
  busySlotIdsByResourceId?: Record<string, string[]>
  locations: BookingLocation[]
  resources: BookingResource[]
}

// реализация BookingService с файловым хранилищем
export class MockBookingService implements BookingService {
  private initialized = false
  private readonly busySlotIdsByResourceId = new Map<string, Set<string>>()
  private readonly bookingsByUserId = new Map<number, Booking[]>()
  private readonly storePath: string

  constructor(storePath = resolve(process.cwd(), 'data/booking-store.json')) {
    this.storePath = storePath
  }

  async blockBusySlots(input: { resourceId: string; slotIds: string[] }): Promise<void> {
    await this.loadStore()
    this.busySlotIdsByResourceId.set(input.resourceId, new Set(input.slotIds))
    await this.saveStore()
  }

  // возвращает список всех локаций
  async listLocations(): Promise<BookingLocation[]> {
    await this.loadStore()
    return locations
  }

  // возвращает список ресурсов указанной локации
  async listResources(locationId: string): Promise<BookingResource[]> {
    await this.loadStore()
    return resources.filter((item) => item.locationId === locationId)
  }

  // возвращает доступные слоты, исключая уже забронированные на сегодня
  async listAvailableSlots(resourceId: string): Promise<AvailableSlot[]> {
    await this.loadStore()
    if (!resources.some((item) => item.id === resourceId)) {
      return []
    }
    const bookedSlotIds = this.getBookedSlotIds(resourceId)
    const calendarBusySlotIds = this.busySlotIdsByResourceId.get(resourceId) ?? new Set<string>()
    return createSlots(resourceId).filter((slot) => !bookedSlotIds.has(slot.id) && !calendarBusySlotIds.has(slot.id))
  }

  // создаёт новое бронирование и сохраняет в хранилище
  async createBooking(input: {
    telegramUserId: number
    resourceId: string
    slotId: string
  }): Promise<Booking> {
    await this.loadStore()
    const selectedResource = resources.find((item) => item.id === input.resourceId)
    const location = selectedResource
      ? locations.find((item) => item.id === selectedResource.locationId)
      : undefined
    const slot = createSlots(input.resourceId).find((item) => item.id === input.slotId)

    if (!selectedResource || !location || !slot) {
      throw new Error('Selected booking option is no longer available.')
    }

    const booking: Booking = {
      id: `booking-${Date.now()}`,
      locationId: location.id,
      locationName: location.name,
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      slotId: input.slotId,
      telegramUserId: input.telegramUserId,
      paidAmountMinorUnits: selectedResource.priceMinorUnits,
      priceLabel: selectedResource.priceLabel,
      startsAt: slot.startsAt,
      startsAtIso: slot.startsAtIso,
      endsAt: slot.endsAt,
      endsAtIso: slot.endsAtIso,
      status: 'active',
    }

    const currentBookings = this.bookingsByUserId.get(input.telegramUserId) ?? []
    this.bookingsByUserId.set(input.telegramUserId, [...currentBookings, booking])
    await this.saveStore()

    return booking
  }

  // возвращает активные бронирования пользователя
  async listUserBookings(telegramUserId: number): Promise<Booking[]> {
    await this.loadStore()
    return (this.bookingsByUserId.get(telegramUserId) ?? []).filter((booking) => booking.status === 'active')
  }

  // возвращает все бронирования всех пользователей
  async listAllBookings(): Promise<Booking[]> {
    await this.loadStore()
    return Array.from(this.bookingsByUserId.values()).flat()
  }

  // отменяет бронирование пользователя
  async cancelBooking(input: { telegramUserId: number; bookingId: string }): Promise<Booking | null> {
    await this.loadStore()
    const bookings = this.bookingsByUserId.get(input.telegramUserId) ?? []
    const booking = bookings.find((item) => item.id === input.bookingId)

    if (!booking) {
      return null
    }

    booking.status = 'cancelled'
    await this.saveStore()

    return booking
  }

  // переносит бронирование на новый слот без дополнительной оплаты
  async rescheduleBooking(input: { bookingId: string; telegramUserId: number; newSlotId: string }): Promise<Booking> {
    await this.loadStore()
    const userBookings = this.bookingsByUserId.get(input.telegramUserId) ?? []
    const oldBooking = userBookings.find((b) => b.id === input.bookingId && b.status === 'active')

    if (!oldBooking) {
      throw new Error('Active booking was not found.')
    }

    const newSlot = createSlots(oldBooking.resourceId).find((s) => s.id === input.newSlotId)

    if (!newSlot) {
      throw new Error('Slot was not found.')
    }

    const bookedSlotIds = this.getBookedSlotIds(oldBooking.resourceId)
    if (bookedSlotIds.has(input.newSlotId)) {
      throw new Error('This slot is already booked.')
    }

    oldBooking.status = 'rescheduled'

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      locationId: oldBooking.locationId,
      locationName: oldBooking.locationName,
      resourceId: oldBooking.resourceId,
      resourceName: oldBooking.resourceName,
      slotId: input.newSlotId,
      telegramUserId: oldBooking.telegramUserId,
      paidAmountMinorUnits: oldBooking.paidAmountMinorUnits,
      priceLabel: oldBooking.priceLabel,
      startsAt: newSlot.startsAt,
      startsAtIso: newSlot.startsAtIso,
      endsAt: newSlot.endsAt,
      endsAtIso: newSlot.endsAtIso,
      status: 'active',
    }

    this.bookingsByUserId.set(input.telegramUserId, [...userBookings, newBooking])
    await this.saveStore()

    return newBooking
  }

  async updateBookingCalendarEvents(input: {
    bookingId: string
    calendarEventIds: Partial<Record<'google' | 'microsoft', string>>
    telegramUserId: number
  }): Promise<Booking | null> {
    await this.loadStore()
    const booking = (this.bookingsByUserId.get(input.telegramUserId) ?? []).find((item) => item.id === input.bookingId)

    if (!booking) {
      return null
    }

    booking.calendarEventIds = {
      ...booking.calendarEventIds,
      ...input.calendarEventIds,
    }
    await this.saveStore()

    return booking
  }

  // обновляет поля локации и сохраняет изменения
  async updateLocation(input: { locationId: string; update: AdminLocationUpdate }): Promise<BookingLocation> {
    await this.loadStore()
    const location = locations.find((item) => item.id === input.locationId)

    if (!location) {
      throw new Error('Location was not found.')
    }

    Object.assign(location, removeUndefinedValues(input.update))
    await this.saveStore()

    return location
  }

  // обновляет поля ресурса и сохраняет изменения
  async updateResource(input: { resourceId: string; update: AdminResourceUpdate }): Promise<BookingResource> {
    await this.loadStore()
    const resource = resources.find((item) => item.id === input.resourceId)

    if (!resource) {
      throw new Error('Resource was not found.')
    }

    Object.assign(resource, removeUndefinedValues(input.update))
    await this.saveStore()

    return resource
  }

  // возвращает id слотов с активными бронированиями для ресурса на сегодня
  private getBookedSlotIds(resourceId: string): Set<string> {
    const booked = new Set<string>()
    const today = new Date().toDateString()

    for (const userBookings of this.bookingsByUserId.values()) {
      for (const booking of userBookings) {
        if (booking.resourceId === resourceId && booking.status === 'active' && booking.slotId) {
          const bookingDate = new Date(booking.startsAtIso).toDateString()
          if (bookingDate === today) {
            booked.add(booking.slotId)
          }
        }
      }
    }

    return booked
  }

  // загружает хранилище из файла при первом вызове
  private async loadStore(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const store = JSON.parse(await readFile(this.storePath, 'utf8')) as Partial<BookingStore>
      replaceArray(locations, store.locations)
      replaceArray(resources, store.resources)
      normalizeResourcePrices(resources)

      this.bookingsByUserId.clear()
      this.busySlotIdsByResourceId.clear()
      for (const [resourceId, slotIds] of Object.entries(store.busySlotIdsByResourceId ?? {})) {
        this.busySlotIdsByResourceId.set(resourceId, new Set(slotIds))
      }
      for (const [telegramUserId, bookings] of Object.entries(store.bookingsByUserId ?? {})) {
        const userId = Number(telegramUserId)
        // добавляем telegramUserId и slotId для бронирований из старых версий хранилища
        const normalizedBookings = bookings.map((b) => ({ ...b, slotId: b.slotId ?? '', telegramUserId: userId }))
        normalizeBookingPrices(normalizedBookings)
        this.bookingsByUserId.set(userId, normalizedBookings)
      }
      await this.saveStore()
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error
      }

      await this.saveStore()
    }

    this.initialized = true
  }

  // сохраняет текущее состояние хранилища в файл
  private async saveStore(): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true })
    const store: BookingStore = {
      bookingsByUserId: Object.fromEntries(this.bookingsByUserId),
      busySlotIdsByResourceId: Object.fromEntries(
        Array.from(this.busySlotIdsByResourceId.entries()).map(([resourceId, slotIds]) => [
          resourceId,
          Array.from(slotIds),
        ]),
      ),
      locations,
      resources,
    }

    await writeFile(this.storePath, `${JSON.stringify(store, null, 2)}\n`)
  }
}

export class FileBookingService extends MockBookingService {}

// заменяет содержимое массива без создания нового
function replaceArray<T>(target: T[], source: T[] | undefined): void {
  if (!source) {
    return
  }

  target.splice(0, target.length, ...source)
}

// удаляет undefined-значения из объекта перед сохранением
function removeUndefinedValues<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

// проверяет, является ли ошибка отсутствием файла
function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
