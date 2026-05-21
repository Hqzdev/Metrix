import { runHealthChecks } from '@metrix/health'
import { audit, extractUserId, readJsonBody, verifyServiceRequest } from '@metrix/auth'
import { writeAuditLog, type AuditLogInput } from '@metrix/audit-log'
import { STREAMS } from '@metrix/contracts'
import type { PrismaClient } from '@prisma/client'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { RedisBus, SlotLocker } from '@metrix/redis-bus'
import { randomUUID } from 'node:crypto'
import type { BookingServiceConfig } from './config.js'
import type { ReminderScheduler } from './reminder-scheduler.js'
import {
  AuthenticationError,
  BookingServiceError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ReplayAttackError,
  ValidationError,
} from './errors.js'
import { sendJson } from './http-response.js'
import type { BookingServiceLogger } from './logger.js'
import { serializeBooking, type BookingRecord } from './booking-serialization.js'
import { createSlots, createSlotsForDate, parseCustomSlot } from './slots.js'
import { assertValidTransition } from './booking-fsm.js'
import {
  parseBlockSlotsInput,
  parseCreateBookingInput,
  parseIdempotencyKey,
  parseUpdateBookingStatusInput,
  parseUpdateLocationInput,
  parseUpdateResourceInput,
  readIdFromPath,
} from './validation.js'

type BookingRouterDependencies = {
  bus: RedisBus
  config: BookingServiceConfig
  logger: BookingServiceLogger
  prisma: PrismaClient
  slotLocker: SlotLocker
  reminderScheduler: ReminderScheduler | null
}

type RequestContext = {
  callerName: string
  callerUserId?: number
  method: string
  parsedBody: unknown
  path: string
  requestId: string
  url: URL
}

const ROOMS_PER_LOCATION = 10
const SLOTS_PER_RESOURCE = 3
const MANAGED_ROOM_ID = /-room-\d{2}$/

/**
 * Обрабатывает HTTP API booking-service.
 *
 * Router держит транспорт, auth и validation отдельно от сериализации и
 * доменных операций, чтобы каждый сценарий был коротким и предсказуемым.
 */
export class BookingRouter {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly dependencies: BookingRouterDependencies) {}

  /**
   * Обрабатывает входящий HTTP-запрос и отправляет результат или ошибку.
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const context = await this.createRequestContext(req)
      const result = await this.dispatch(context)
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    const url = new URL(req.url ?? '/', `http://localhost:${this.dependencies.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', method, parsedBody: {}, path, requestId: 'health-check', url }
    }

    const { parsedBody, rawBody } = await readRequestBody(req, method)
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)
    if (!auth.ok) throw new AuthenticationError(auth.error)

    const fresh = await this.dependencies.bus.checkReplay(auth.requestId)
    if (!fresh) throw new ReplayAttackError()

    return {
      callerName: auth.callerName,
      callerUserId: this.extractCallerUserId(req),
      method,
      parsedBody,
      path,
      requestId: auth.requestId,
      url,
    }
  }

  /**
   * Извлекает проверенный Telegram user id из доверенных заголовков.
   */
  private extractCallerUserId(req: IncomingMessage): number | undefined {
    if (!this.dependencies.config.userIdSigningSecret) return undefined

    try {
      return extractUserId(req, this.dependencies.config.userIdSigningSecret)
    } catch {
      throw new AuthenticationError('invalid user identity')
    }
  }

  /**
   * Выбирает доменный обработчик по методу и пути запроса.
   */
  private async dispatch(context: RequestContext): Promise<{ body: unknown; statusCode: number }> {
    const { method, path } = context

    if (method === 'GET' && path === '/health') return this.handleHealth()
    if (method === 'GET' && path === '/locations') return { body: await this.listLocations(), statusCode: 200 }
    if (method === 'GET' && path === '/resources') return { body: await this.listResources(context), statusCode: 200 }
    if (method === 'GET' && path.startsWith('/resources/')) return { body: await this.getResource(context), statusCode: 200 }
    if (method === 'GET' && path === '/slots') return { body: await this.listAvailableSlots(context), statusCode: 200 }
    if (method === 'GET' && path === '/users/me/preferences') return { body: await this.getUserPreferences(context), statusCode: 200 }
    if (method === 'PATCH' && path === '/users/me/preferences') return { body: await this.updateUserPreferences(context), statusCode: 200 }
    if (method === 'GET' && path === '/bookings') return { body: await this.listBookings(context), statusCode: 200 }
    if (method === 'POST' && path === '/bookings') return { body: await this.createBooking(context), statusCode: 201 }
    if (method === 'PATCH' && path.startsWith('/bookings/')) return { body: await this.updateBookingStatus(context), statusCode: 200 }
    if (method === 'POST' && path === '/slots/block') return { body: await this.blockSlots(context), statusCode: 200 }
    if (method === 'PATCH' && path.startsWith('/locations/')) return { body: await this.updateLocation(context), statusCode: 200 }
    if (method === 'PATCH' && path.startsWith('/resources/')) return { body: await this.updateResource(context), statusCode: 200 }

    throw new NotFoundError()
  }

  /**
   * Проверяет доступность DB и Redis — возвращает детальный статус.
   * 200 = всё ok, 503 = хотя бы одна зависимость недоступна.
   */
  private async handleHealth(): Promise<{ body: unknown; statusCode: number }> {
    const result = await runHealthChecks({
      prisma: this.dependencies.prisma,
      redis: this.dependencies.bus.getRedisClient(),
    })
    return { body: result, statusCode: result.ok ? 200 : 503 }
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listLocations(): Promise<unknown> {
    const [locations, activeBookings] = await Promise.all([
      this.dependencies.prisma.location.findMany(),
      this.dependencies.prisma.booking.findMany({
        select: { locationId: true },
        where: { status: 'active' },
      }),
    ])

    const activeByLocation = countBy(activeBookings, (booking) => booking.locationId)

    return locations.map((location) => {
      const activeCount = activeByLocation.get(location.id) ?? 0
      const bookedRooms = Math.min(activeCount, ROOMS_PER_LOCATION)

      return {
        ...location,
        members: `${activeCount} active booking${activeCount === 1 ? '' : 's'}`,
        occupancy: `${bookedRooms}/${ROOMS_PER_LOCATION} booked`,
      }
    })
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listResources(context: RequestContext): Promise<unknown> {
    const locationId = context.url.searchParams.get('locationId')
    const resources = locationId
      ? await this.dependencies.prisma.resource.findMany({ where: { locationId } })
      : await this.dependencies.prisma.resource.findMany()

    const bookableResources = resources
      .filter((resource) => MANAGED_ROOM_ID.test(resource.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, locationId ? ROOMS_PER_LOCATION : undefined)

    const activeBookings = await this.dependencies.prisma.booking.findMany({
      select: { resourceId: true },
      where: { resourceId: { in: bookableResources.map((resource) => resource.id) }, status: 'active' },
    })
    const activeByResource = countBy(activeBookings, (booking) => booking.resourceId)

    return bookableResources.map((resource) => {
      const activeCount = activeByResource.get(resource.id) ?? 0
      const slotsLeft = Math.max(SLOTS_PER_RESOURCE - activeCount, 0)

      return {
        ...resource,
        occupancy: `${activeCount} booking${activeCount === 1 ? '' : 's'}`,
        status: activeCount >= SLOTS_PER_RESOURCE ? 'Fully booked' : slotsLeft === SLOTS_PER_RESOURCE ? 'Available' : `${slotsLeft} slots left`,
      }
    })
  }

  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  private async getResource(context: RequestContext): Promise<unknown> {
    const resourceId = readIdFromPath(context.path, '/resources/')
    const resource = await this.dependencies.prisma.resource.findUnique({ where: { id: resourceId } })
    if (!resource) throw new NotFoundError()
    return resource
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   *
   * Если передан query-параметр `date` (YYYYMMDD), возвращает слоты для этой даты.
   * Без параметра — стандартные слоты на сегодня (legacy-flow).
   */
  private async listAvailableSlots(context: RequestContext): Promise<unknown> {
    const resourceId = context.url.searchParams.get('resourceId')
    if (!resourceId) throw new ValidationError('resourceId required')

    const dateParam = context.url.searchParams.get('date')

    const bookedSlots = await this.dependencies.prisma.booking.findMany({
      select: { slotId: true },
      where: { resourceId, status: 'active' },
    })
    const busySlots = await this.dependencies.prisma.busySlot.findMany({
      select: { slotId: true },
      where: { resourceId },
    })
    const blockedSlotIds = new Set([...bookedSlots.map((slot) => slot.slotId), ...busySlots.map((slot) => slot.slotId)])

    const allSlots = dateParam ? createSlotsForDate(resourceId, dateParam) : createSlots(resourceId)
    return allSlots.filter((slot) => !blockedSlotIds.has(slot.id))
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listBookings(context: RequestContext): Promise<unknown> {
    const userId = context.callerUserId ?? context.url.searchParams.get('telegramUserId')
    const bookings = userId
      ? await this.dependencies.prisma.booking.findMany({ where: { telegramUserId: BigInt(userId), status: 'active' } })
      : await this.dependencies.prisma.booking.findMany()

    return bookings.map(serializeBooking)
  }

  private async getUserPreferences(context: RequestContext): Promise<unknown> {
    if (!context.callerUserId) throw new ValidationError('telegram user identity required')

    const preferences = await this.dependencies.prisma.telegramUserPreference.findUnique({
      where: { telegramUserId: BigInt(context.callerUserId) },
    })

    return { language: preferences?.language ?? null }
  }

  private async updateUserPreferences(context: RequestContext): Promise<unknown> {
    if (!context.callerUserId) throw new ValidationError('telegram user identity required')

    const body = context.parsedBody as { language?: unknown }
    const language = body.language
    if (language !== 'en' && language !== 'ru') {
      throw new ValidationError('language must be en or ru')
    }

    const preferences = await this.dependencies.prisma.telegramUserPreference.upsert({
      create: { language, telegramUserId: BigInt(context.callerUserId) },
      update: { language },
      where: { telegramUserId: BigInt(context.callerUserId) },
    })

    return { language: preferences.language }
  }

  /**
   * Создаёт доменную сущность или запрос к downstream-сервису.
   *
   * Idempotency: если в заголовке X-Idempotency-Key передан ключ и бронирование
   * с этим ключом уже существует — возвращаем его без повторного создания.
   * Это защищает от дублей при network retry на стороне клиента.
   *
   * Locking: перед транзакцией захватываем Redis-лок на (resourceId, slotId).
   * Без этого два параллельных запроса могут оба создать бронирование на одно время.
   */
  private async createBooking(context: RequestContext): Promise<unknown> {
    const input = parseCreateBookingInput(context.parsedBody, context.callerUserId)
    const idempotencyKey = parseIdempotencyKey(context.parsedBody)

    // idempotency check: вернуть существующее бронирование если ключ уже использован
    if (idempotencyKey) {
      const existing = await this.dependencies.prisma.booking.findUnique({
        where: { idempotencyKey },
      })
      if (existing) return serializeBooking(existing)
    }

    const resource = await this.dependencies.prisma.resource.findUnique({
      include: { location: true },
      where: { id: input.resourceId },
    })
    if (!resource) throw new NotFoundError('resource not found')

    // Сначала ищем в стандартных слотах (legacy), затем пробуем кастомный формат
    const slot = createSlots(input.resourceId).find((item) => item.id === input.slotId)
      ?? parseCustomSlot(input.resourceId, input.slotId)
    if (!slot) throw new NotFoundError('slot not found')

    // distributed lock: захватываем слот до начала транзакции
    const lockToken = await this.dependencies.slotLocker.acquire(input.resourceId, input.slotId)
    if (!lockToken) throw new ConflictError('slot already being booked, retry in a moment')

    try {
      const booking = await this.createBookingTransaction(input, resource, slot, idempotencyKey)
      const result = serializeBooking(booking)
      await this.dependencies.bus.publish(STREAMS.BOOKING_CREATED, { booking: result })

      // ставим delayed reminder job — выполнится за 15 минут до начала бронирования
      if (this.dependencies.reminderScheduler) {
        await this.dependencies.reminderScheduler.scheduleReminder({
          bookingId: result.id,
          telegramUserId: result.telegramUserId,
          chatId: result.telegramUserId, // для private chat chatId === userId
          resourceName: result.resourceName,
          locationName: result.locationName,
          startsAt: result.startsAt,
          startsAtIso: result.startsAtIso,
        })
      }

      audit({
        action: 'booking.created',
        bookingId: result.id,
        callerService: context.callerName,
        idempotencyKey: idempotencyKey ?? undefined,
        requestId: context.requestId,
        service: 'booking',
        ts: new Date().toISOString(),
        userId: input.telegramUserId,
      })
      await this.writeAudit({
        action: 'booking.created',
        actorUserId: input.telegramUserId,
        callerService: context.callerName,
        entityId: result.id,
        entityType: 'booking',
        payload: {
          idempotencyKey: idempotencyKey ?? undefined,
          resourceId: result.resourceId,
          slotId: result.slotId,
        },
        requestId: context.requestId,
        service: 'booking',
      })

      return result
    } finally {
      await this.dependencies.slotLocker.release(input.resourceId, input.slotId, lockToken)
    }
  }

  private async createBookingTransaction(
    input: { resourceId: string; slotId: string; telegramUserId: number },
    resource: ResourceWithLocation,
    slot: SlotData,
    idempotencyKey: string | null,
  ): Promise<BookingRecord> {
    try {
      return await this.dependencies.prisma.$transaction(async (tx) => {
        const taken = await tx.booking.findFirst({
          where: { resourceId: input.resourceId, slotId: input.slotId, status: 'active' },
        })
        if (taken) throw Object.assign(new Error('slot already booked'), { code: 'SLOT_TAKEN' })

        const booking = await tx.booking.create({
          data: {
            endsAt: slot.endsAt,
            endsAtIso: new Date(slot.endsAtIso),
            id: randomUUID(),
            idempotencyKey: idempotencyKey ?? undefined,
            locationId: resource.locationId,
            locationName: resource.location.name,
            paidAmountMinorUnits: resource.priceMinorUnits,
            priceLabel: resource.priceLabel,
            resourceId: resource.id,
            resourceName: resource.name,
            slotId: input.slotId,
            startsAt: slot.startsAt,
            startsAtIso: new Date(slot.startsAtIso),
            status: 'active',
            telegramUserId: BigInt(input.telegramUserId),
          },
        })

        return booking as BookingRecord
      })
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'SLOT_TAKEN' || code === 'P2002') throw new ConflictError('slot already booked')
      throw error
    }
  }

  /**
   * Обновляет существующую доменную сущность.
   *
   * FSM: проверяет допустимость перехода статуса до обновления в БД.
   * Недопустимые переходы (cancelled → active, etc.) бросают ConflictError.
   */
  private async updateBookingStatus(context: RequestContext): Promise<unknown> {
    const bookingId = readIdFromPath(context.path, '/bookings/')
    const input = parseUpdateBookingStatusInput(context.parsedBody)
    const existing = await this.dependencies.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!existing) throw new NotFoundError()

    // FSM guard: проверяем что переход допустим
    assertValidTransition(existing.status, input.status)

    if (context.callerUserId !== undefined && Number(existing.telegramUserId) !== context.callerUserId) {
      audit({
        action: 'booking.cancel.forbidden',
        bookingId,
        requestId: context.requestId,
        service: 'booking',
        ts: new Date().toISOString(),
        userId: context.callerUserId,
      })
      await this.writeAudit({
        action: 'booking.cancel.forbidden',
        actorUserId: context.callerUserId,
        entityId: bookingId,
        entityType: 'booking',
        requestId: context.requestId,
        service: 'booking',
      })
      throw new ForbiddenError()
    }

    const updated = await this.dependencies.prisma.booking.update({
      data: { status: input.status },
      where: { id: bookingId },
    })
    const result = serializeBooking(updated)

    if (input.status === 'cancelled') {
      await this.dependencies.bus.publish(STREAMS.BOOKING_CANCELLED, { booking: result })

      // отменяем pending reminder job если он ещё не сработал
      if (this.dependencies.reminderScheduler) {
        await this.dependencies.reminderScheduler.cancelReminder(bookingId)
      }

      audit({
        action: 'booking.cancelled',
        bookingId,
        callerService: context.callerName,
        requestId: context.requestId,
        service: 'booking',
        ts: new Date().toISOString(),
        userId: context.callerUserId ?? Number(existing.telegramUserId),
      })
      await this.writeAudit({
        action: 'booking.cancelled',
        actorUserId: context.callerUserId ?? Number(existing.telegramUserId),
        callerService: context.callerName,
        entityId: bookingId,
        entityType: 'booking',
        requestId: context.requestId,
        service: 'booking',
      })
    }

    return result
  }

  /**
   * Пишет persistent audit log без влияния на основной бизнес-flow.
   */
  private async writeAudit(input: AuditLogInput): Promise<void> {
    try {
      await writeAuditLog(this.dependencies.prisma, input)
    } catch (error) {
      this.dependencies.logger.error({
        action: 'audit.persist.failed',
        error,
        message: 'Failed to persist audit log',
        service: 'booking-service',
      })
    }
  }

  /**
   * Блокирует выбранные слоты ресурса.
   */
  private async blockSlots(context: RequestContext): Promise<unknown> {
    const input = parseBlockSlotsInput(context.parsedBody)
    await this.dependencies.prisma.busySlot.deleteMany({ where: { resourceId: input.resourceId } })
    await this.dependencies.prisma.busySlot.createMany({
      data: input.slotIds.map((slotId) => ({ resourceId: input.resourceId, slotId })),
      skipDuplicates: true,
    })
    return { ok: true }
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private updateLocation(context: RequestContext): Promise<unknown> {
    const locationId = readIdFromPath(context.path, '/locations/')
    const input = parseUpdateLocationInput(context.parsedBody)
    return this.dependencies.prisma.location.update({ data: input, where: { id: locationId } })
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private updateResource(context: RequestContext): Promise<unknown> {
    const resourceId = readIdFromPath(context.path, '/resources/')
    const input = parseUpdateResourceInput(context.parsedBody)
    return this.dependencies.prisma.resource.update({ data: input, where: { id: resourceId } })
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof BookingServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    this.dependencies.logger.error({
      error,
      message: 'Unhandled booking-service error',
      service: 'booking-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

type ResourceWithLocation = {
  id: string
  location: { name: string }
  locationId: string
  name: string
  priceLabel: string
  priceMinorUnits: number
}

type SlotData = {
  endsAt: string
  endsAtIso: string
  startsAt: string
  startsAtIso: string
}

/**
 * Читает тело HTTP-запроса и безопасно парсит JSON.
 */
async function readRequestBody(req: IncomingMessage, method: string): Promise<{ parsedBody: unknown; rawBody: string }> {
  if (method === 'GET') return { parsedBody: {}, rawBody: '' }

  const result = await readJsonBody<unknown>(req)
  return {
    parsedBody: result.parsed,
    rawBody: result.raw,
  }
}

function countBy<TItem>(items: TItem[], getKey: (item: TItem) => string): Map<string, number> {
  const counts = new Map<string, number>()

  for (const item of items) {
    const key = getKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}
