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
import type { BookingCompletionScheduler } from './booking-completion-scheduler.js'
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

// Все зависимости router получает через constructor, чтобы не создавать их внутри обработчиков.
type BookingRouterDependencies = {
  // RedisBus публикует события и проверяет replay requestId.
  bus: RedisBus
  // Scheduler, который завершает бронирование после времени окончания.
  completionScheduler: BookingCompletionScheduler | null
  // Runtime-конфиг сервиса.
  config: BookingServiceConfig
  // JSON-логгер сервиса.
  logger: BookingServiceLogger
  // Prisma-клиент для PostgreSQL.
  prisma: PrismaClient
  // Redis-lock на ресурс и слот.
  slotLocker: SlotLocker
  // Scheduler напоминаний перед началом бронирования.
  reminderScheduler: ReminderScheduler | null
}

// Внутренний контекст одного HTTP-запроса после авторизации и разбора тела.
type RequestContext = {
  // Имя сервиса, который вызвал booking-service.
  callerName: string
  // Telegram user id, если он был подписан и передан caller-ом.
  callerUserId?: number
  // HTTP-метод запроса.
  method: string
  // Распарсенное JSON-тело.
  parsedBody: unknown
  // Path без query string.
  path: string
  // Уникальный id запроса для логов, audit и replay-защиты.
  requestId: string
  // Полный URL-объект, включая query-параметры.
  url: URL
}

// Сколько комнат показываем для одной локации в управляемом сценарии.
const ROOMS_PER_LOCATION = 10
// Сколько активных бронирований допускаем на один ресурс.
const SLOTS_PER_RESOURCE = 3
// Регулярка отделяет управляемые комнаты от других ресурсов.
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
      // Сначала превращаем сырой HTTP-запрос в RequestContext.
      const context = await this.createRequestContext(req)
      // Затем выбираем нужный handler по method/path.
      const result = await this.dispatch(context)
      // Все успешные ответы уходят в едином JSON-формате.
      sendJson(res, result.body, result.statusCode)
    } catch (error) {
      // Ошибки также переводим в JSON-ответ.
      this.handleError(res, error)
    }
  }

  /**
   * Собирает метод, путь, тело и сведения об авторизации в единый контекст.
   */
  private async createRequestContext(req: IncomingMessage): Promise<RequestContext> {
    // IncomingMessage даёт относительный URL, поэтому нужен base.
    const url = new URL(req.url ?? '/', `http://localhost:${this.dependencies.config.port}`)
    const method = req.method ?? 'GET'
    const path = url.pathname

    // Health endpoint доступен без service-to-service подписи.
    if (method === 'GET' && path === '/health') {
      return { callerName: 'health-check', method, parsedBody: {}, path, requestId: 'health-check', url }
    }

    // Для проверки подписи нужен rawBody, а для handlers — parsedBody.
    const { parsedBody, rawBody } = await readRequestBody(req, method)
    // Проверяем, что запрос пришёл от доверенного внутреннего сервиса.
    const auth = verifyServiceRequest(req, rawBody, this.dependencies.config.trustedCallers)
    if (!auth.ok) throw new AuthenticationError(auth.error)

    // Replay-защита не даёт повторно обработать один и тот же requestId.
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
    // Если userIdSigningSecret не настроен, caller user id не поддерживается.
    if (!this.dependencies.config.userIdSigningSecret) return undefined

    try {
      // extractUserId проверяет подпись user id, а не просто читает заголовок.
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

    // Служебная проверка здоровья сервиса.
    if (method === 'GET' && path === '/health') return this.handleHealth()
    // Список локаций для выбора пользователем или админкой.
    if (method === 'GET' && path === '/locations') return { body: await this.listLocations(), statusCode: 200 }
    // Список ресурсов, optionally отфильтрованный по locationId.
    if (method === 'GET' && path === '/resources') return { body: await this.listResources(context), statusCode: 200 }
    // Детальная информация по одному ресурсу.
    if (method === 'GET' && path.startsWith('/resources/')) return { body: await this.getResource(context), statusCode: 200 }
    // Доступные слоты для ресурса.
    if (method === 'GET' && path === '/slots') return { body: await this.listAvailableSlots(context), statusCode: 200 }
    // Языковые настройки текущего Telegram-пользователя.
    if (method === 'GET' && path === '/users/me/preferences') return { body: await this.getUserPreferences(context), statusCode: 200 }
    // Обновление языковых настроек текущего Telegram-пользователя.
    if (method === 'PATCH' && path === '/users/me/preferences') return { body: await this.updateUserPreferences(context), statusCode: 200 }
    // Список бронирований.
    if (method === 'GET' && path === '/bookings') return { body: await this.listBookings(context), statusCode: 200 }
    // Создание нового бронирования.
    if (method === 'POST' && path === '/bookings') return { body: await this.createBooking(context), statusCode: 201 }
    // Изменение статуса существующего бронирования.
    if (method === 'PATCH' && path.startsWith('/bookings/')) return { body: await this.updateBookingStatus(context), statusCode: 200 }
    // Ручная блокировка слотов ресурса.
    if (method === 'POST' && path === '/slots/block') return { body: await this.blockSlots(context), statusCode: 200 }
    // Обновление локации, обычно из admin-service.
    if (method === 'PATCH' && path.startsWith('/locations/')) return { body: await this.updateLocation(context), statusCode: 200 }
    // Обновление ресурса, обычно из admin-service.
    if (method === 'PATCH' && path.startsWith('/resources/')) return { body: await this.updateResource(context), statusCode: 200 }

    // Всё, что не совпало с route-ами, считаем 404.
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
    // Локации и активные бронирования можно читать параллельно.
    const [locations, activeBookings] = await Promise.all([
      this.dependencies.prisma.location.findMany(),
      this.dependencies.prisma.booking.findMany({
        select: { locationId: true },
        where: { status: 'active' },
      }),
    ])

    // Считаем активные бронирования по каждой локации.
    const activeByLocation = countBy(activeBookings, (booking) => booking.locationId)

    return locations.map((location) => {
      // Если по локации нет бронирований, считаем 0.
      const activeCount = activeByLocation.get(location.id) ?? 0
      // bookedRooms не должен быть больше общего количества комнат.
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
    // locationId позволяет показать ресурсы только одной локации.
    const locationId = context.url.searchParams.get('locationId')
    const resources = locationId
      ? await this.dependencies.prisma.resource.findMany({ where: { locationId } })
      : await this.dependencies.prisma.resource.findMany()

    // Показываем только управляемые комнаты и сортируем их по id.
    const bookableResources = resources
      .filter((resource) => MANAGED_ROOM_ID.test(resource.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, locationId ? ROOMS_PER_LOCATION : undefined)

    // Загружаем активные бронирования только для ресурсов, которые реально показываем.
    const activeBookings = await this.dependencies.prisma.booking.findMany({
      select: { resourceId: true },
      where: { resourceId: { in: bookableResources.map((resource) => resource.id) }, status: 'active' },
    })
    // Быстро считаем активные бронирования по каждому ресурсу.
    const activeByResource = countBy(activeBookings, (booking) => booking.resourceId)

    return bookableResources.map((resource) => {
      // activeCount показывает, сколько слотов ресурса уже занято.
      const activeCount = activeByResource.get(resource.id) ?? 0
      // slotsLeft не должен уходить в минус.
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
    // resourceId берём из пути /resources/:id.
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
    // Без resourceId нельзя понять, для какого ресурса строить слоты.
    const resourceId = context.url.searchParams.get('resourceId')
    if (!resourceId) throw new ValidationError('resourceId required')

    // date позволяет запросить слоты на конкретный день.
    const dateParam = context.url.searchParams.get('date')

    // Активные бронирования занимают слоты.
    const bookedSlots = await this.dependencies.prisma.booking.findMany({
      select: { slotId: true },
      where: { resourceId, status: 'active' },
    })
    // BusySlot — это ручная блокировка слотов админом или системой.
    const busySlots = await this.dependencies.prisma.busySlot.findMany({
      select: { slotId: true },
      where: { resourceId },
    })
    // Set нужен для быстрой проверки "занят ли slotId".
    const blockedSlotIds = new Set([...bookedSlots.map((slot) => slot.slotId), ...busySlots.map((slot) => slot.slotId)])

    // Если дата задана, строим слоты на неё; иначе используем legacy-слоты.
    const allSlots = dateParam ? createSlotsForDate(resourceId, dateParam) : createSlots(resourceId)
    return allSlots.filter((slot) => !blockedSlotIds.has(slot.id))
  }

  /**
   * Возвращает список сущностей для текущего запроса.
   */
  private async listBookings(context: RequestContext): Promise<unknown> {
    // Для пользовательского запроса берём callerUserId, для внутренних можно передать telegramUserId query.
    const userId = context.callerUserId ?? context.url.searchParams.get('telegramUserId')
    const bookings = userId
      ? await this.dependencies.prisma.booking.findMany({ where: { telegramUserId: BigInt(userId), status: 'active' } })
      : await this.dependencies.prisma.booking.findMany()

    // Сериализуем каждую запись, чтобы Date/BigInt стали JSON-safe.
    return bookings.map(serializeBooking)
  }

  /**
   * Возвращает языковые настройки текущего пользователя.
   */
  private async getUserPreferences(context: RequestContext): Promise<unknown> {
    // Этот endpoint имеет смысл только когда caller передал подписанный Telegram user id.
    if (!context.callerUserId) throw new ValidationError('telegram user identity required')

    const preferences = await this.dependencies.prisma.telegramUserPreference.findUnique({
      where: { telegramUserId: BigInt(context.callerUserId) },
    })

    // null означает, что пользователь ещё не выбирал язык.
    return { language: preferences?.language ?? null }
  }

  /**
   * Обновляет языковые настройки текущего пользователя.
   */
  private async updateUserPreferences(context: RequestContext): Promise<unknown> {
    // Нельзя менять настройки без подтверждённого user id.
    if (!context.callerUserId) throw new ValidationError('telegram user identity required')

    // Сейчас поддерживаются только два языка интерфейса.
    const body = context.parsedBody as { language?: unknown }
    const language = body.language
    if (language !== 'en' && language !== 'ru') {
      throw new ValidationError('language must be en or ru')
    }

    // upsert создаёт запись при первом выборе языка или обновляет существующую.
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
    // Валидируем входные данные и подставляем callerUserId, если он есть.
    const input = parseCreateBookingInput(context.parsedBody, context.callerUserId)
    // Idempotency key защищает от дублей при повторе одного и того же запроса.
    const idempotencyKey = parseIdempotencyKey(context.parsedBody)

    // Idempotency check: вернуть существующее бронирование, если ключ уже использован.
    if (idempotencyKey) {
      const existing = await this.dependencies.prisma.booking.findUnique({
        where: { idempotencyKey },
      })
      if (existing) return serializeBooking(existing)
    }

    // Ресурс нужен вместе с локацией, чтобы сохранить названия в booking record.
    const resource = await this.dependencies.prisma.resource.findUnique({
      include: { location: true },
      where: { id: input.resourceId },
    })
    if (!resource) throw new NotFoundError('resource not found')

    // Сначала ищем в стандартных слотах (legacy), затем пробуем кастомный формат.
    const slot = createSlots(input.resourceId).find((item) => item.id === input.slotId)
      ?? parseCustomSlot(input.resourceId, input.slotId)
    if (!slot) throw new NotFoundError('slot not found')

    // Distributed lock: захватываем слот до начала транзакции.
    const lockToken = await this.dependencies.slotLocker.acquire(input.resourceId, input.slotId)
    if (!lockToken) throw new ConflictError('slot already being booked, retry in a moment')

    try {
      // Внутри транзакции ещё раз проверяем, что слот не занят.
      const booking = await this.createBookingTransaction(input, resource, slot, idempotencyKey)
      const result = serializeBooking(booking)
      // Событие нужно другим сервисам: аналитике, уведомлениям, календарю.
      await this.dependencies.bus.publish(STREAMS.BOOKING_CREATED, { booking: result })

      // Ставим delayed reminder job — выполнится за 15 минут до начала бронирования.
      if (this.dependencies.reminderScheduler) {
        // Напоминание отправляем на языке пользователя, если он уже выбран.
        const langPreference = await this.dependencies.prisma.telegramUserPreference.findUnique({
          select: { language: true },
          where: { telegramUserId: BigInt(input.telegramUserId) },
        })
        await this.dependencies.reminderScheduler.scheduleReminder({
          bookingId: result.id,
          telegramUserId: result.telegramUserId,
          chatId: result.telegramUserId, // Для private chat chatId === userId.
          resourceName: result.resourceName,
          locationName: result.locationName,
          startsAt: result.startsAt,
          startsAtIso: result.startsAtIso,
          language: (langPreference?.language as 'en' | 'ru' | undefined) ?? 'en',
        })
      }

      // Ставим delayed job для автоматического перевода в completed после окончания брони.
      if (this.dependencies.completionScheduler) {
        await this.dependencies.completionScheduler.scheduleCompletion(
          { bookingId: result.id, telegramUserId: result.telegramUserId },
          result.endsAtIso,
        )
      }

      // Лёгкий audit event для общей audit-системы.
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
      // Persistent audit log остаётся в базе для админского интерфейса и расследований.
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
      // Lock освобождаем всегда, даже если внутри произошла ошибка.
      await this.dependencies.slotLocker.release(input.resourceId, input.slotId, lockToken)
    }
  }

  /**
   * Создаёт booking внутри транзакции PostgreSQL.
   */
  private async createBookingTransaction(
    input: { resourceId: string; slotId: string; telegramUserId: number },
    resource: ResourceWithLocation,
    slot: SlotData,
    idempotencyKey: string | null,
  ): Promise<BookingRecord> {
    try {
      return await this.dependencies.prisma.$transaction(async (tx) => {
        // Вторая проверка занятости нужна даже при Redis-lock, чтобы база оставалась источником истины.
        const taken = await tx.booking.findFirst({
          where: { resourceId: input.resourceId, slotId: input.slotId, status: 'active' },
        })
        if (taken) throw Object.assign(new Error('slot already booked'), { code: 'SLOT_TAKEN' })

        // Создаём snapshot бронирования: сохраняем имена и цену на момент покупки.
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
      // P2002 — Prisma unique constraint, например дубль idempotencyKey или slot constraint.
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
    // bookingId берём из URL /bookings/:id.
    const bookingId = readIdFromPath(context.path, '/bookings/')
    // Проверяем, что новый статус вообще допустим по формату.
    const input = parseUpdateBookingStatusInput(context.parsedBody)
    // Загружаем текущее состояние, чтобы проверить переход статуса.
    const existing = await this.dependencies.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!existing) throw new NotFoundError()

    // FSM guard: проверяем, что переход допустим.
    assertValidTransition(existing.status, input.status)

    // Пользователь может менять только свои бронирования.
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

    // После проверок обновляем статус в базе.
    const updated = await this.dependencies.prisma.booking.update({
      data: { status: input.status },
      where: { id: bookingId },
    })
    const result = serializeBooking(updated)

    // completed публикуется отдельно, чтобы downstream-сервисы знали о завершении.
    if (input.status === 'completed') {
      await this.dependencies.bus.publish(STREAMS.BOOKING_COMPLETED, { booking: result })
    }

    // cancelled требует событий, отмены jobs и audit log.
    if (input.status === 'cancelled') {
      await this.dependencies.bus.publish(STREAMS.BOOKING_CANCELLED, { booking: result })

      // Отменяем pending reminder и completion jobs, если они ещё не сработали.
      if (this.dependencies.reminderScheduler) {
        await this.dependencies.reminderScheduler.cancelReminder(bookingId)
      }
      if (this.dependencies.completionScheduler) {
        await this.dependencies.completionScheduler.cancelCompletion(bookingId)
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

    // rescheduled закрывает старое бронирование, поэтому старые jobs уже не нужны.
    if (input.status === 'rescheduled') {
      // При переносе старая бронь закрывается — отменяем reminder и completion jobs.
      if (this.dependencies.reminderScheduler) {
        await this.dependencies.reminderScheduler.cancelReminder(bookingId)
      }
      if (this.dependencies.completionScheduler) {
        await this.dependencies.completionScheduler.cancelCompletion(bookingId)
      }
    }

    return result
  }

  /**
   * Пишет persistent audit log без влияния на основной бизнес-flow.
   */
  private async writeAudit(input: AuditLogInput): Promise<void> {
    try {
      // Пишем audit log в PostgreSQL.
      await writeAuditLog(this.dependencies.prisma, input)
    } catch (error) {
      // Audit не должен ломать пользовательский сценарий.
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
    // Валидируем resourceId и список slotIds.
    const input = parseBlockSlotsInput(context.parsedBody)
    // Сначала очищаем старые блокировки ресурса.
    await this.dependencies.prisma.busySlot.deleteMany({ where: { resourceId: input.resourceId } })
    // Потом записываем новый набор заблокированных слотов.
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
    // locationId берём из URL /locations/:id.
    const locationId = readIdFromPath(context.path, '/locations/')
    // В payload оставляем только разрешённые поля.
    const input = parseUpdateLocationInput(context.parsedBody)
    return this.dependencies.prisma.location.update({ data: input, where: { id: locationId } })
  }

  /**
   * Обновляет существующую доменную сущность.
   */
  private updateResource(context: RequestContext): Promise<unknown> {
    // resourceId берём из URL /resources/:id.
    const resourceId = readIdFromPath(context.path, '/resources/')
    // В payload оставляем только разрешённые поля.
    const input = parseUpdateResourceInput(context.parsedBody)
    return this.dependencies.prisma.resource.update({ data: input, where: { id: resourceId } })
  }

  /**
   * Преобразует доменные ошибки в HTTP-ответы и логи.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    // Доменные ошибки уже знают, какой HTTP status code вернуть.
    if (error instanceof BookingServiceError) {
      sendJson(res, { error: error.message }, error.statusCode)
      return
    }

    // Неожиданные ошибки логируем подробно, клиенту отдаём нейтральный текст.
    this.dependencies.logger.error({
      error,
      message: 'Unhandled booking-service error',
      service: 'booking-service',
    })
    sendJson(res, { error: 'internal error' }, 500)
  }
}

// Минимальная форма Resource, которая нужна createBookingTransaction.
type ResourceWithLocation = {
  id: string
  location: { name: string }
  locationId: string
  name: string
  priceLabel: string
  priceMinorUnits: number
}

// Минимальная форма Slot, которую возвращают генераторы слотов.
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
  // GET-запросы не используют body.
  if (method === 'GET') return { parsedBody: {}, rawBody: '' }

  // readJsonBody возвращает и parsed объект, и исходную строку для подписи.
  const result = await readJsonBody<unknown>(req)
  return {
    parsedBody: result.parsed,
    rawBody: result.raw,
  }
}

function countBy<TItem>(items: TItem[], getKey: (item: TItem) => string): Map<string, number> {
  // Map удобен для подсчёта количества элементов по строковому ключу.
  const counts = new Map<string, number>()

  for (const item of items) {
    // getKey решает, по какому полю группировать конкретный item.
    const key = getKey(item)
    // Если ключ встречается впервые, начинаем с 0 и прибавляем 1.
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}
