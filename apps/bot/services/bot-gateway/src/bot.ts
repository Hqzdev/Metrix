import { createTelegramActor, evaluatePolicy } from '@metrix/rbac'
import type { MetricsRegistry } from '@metrix/observability'
import type { ServicesClient } from './services-client.js'
import type { TelegramClient } from './telegram-client.js'
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './telegram-types.js'
import type { TelegramUpdateStore } from './telegram-update-store.js'
import type { UserSessionStore } from './user-session-store.js'
import { parseCallbackData } from './callback-data.js'
import {
  bookingConfirmationPrompt,
  bookingsMessage,
  calendarAuthMessage,
  calendarStatusMessage,
  helpMessage,
  locationsMessage,
  resourcesMessage,
  slotsMessage,
  welcomeMessage,
} from './messages.js'
import {
  bookingsKeyboard,
  calendarAuthKeyboard,
  calendarStatusKeyboard,
  confirmBookingKeyboard,
  confirmCancelKeyboard,
  locationKeyboard,
  mainMenuKeyboard,
  resourceKeyboard,
  slotsKeyboard,
} from './keyboards.js'

type BotOptions = {
  adminTelegramIds: number[]
  logger: {
    error(entry: { error?: unknown; message: string; service: 'bot-gateway'; [key: string]: unknown }): void
    warn(entry: { message: string; service: 'bot-gateway'; [key: string]: unknown }): void
  }
  metrics?: MetricsRegistry
  /** Функция проверки rate limit. Возвращает true если запрос разрешён. */
  rateLimit: (userId: number) => Promise<boolean>
  services: ServicesClient
  sessionStore: UserSessionStore
  telegram: TelegramClient
  updateStore: TelegramUpdateStore
}

/**
 * Координирует Telegram polling, маршрутизацию команд и ответы пользователю.
 */
export class Bot {
  private offset: number | undefined
  private stopping = false

  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly opts: BotOptions) {}

  /**
   * Проверяет admin access и пишет denied decision в structured audit log.
   */
  private canUseAdminFeaturesOrAuditDenied(userId: number, action: string): boolean {
    const actor = createTelegramActor(userId, this.opts.adminTelegramIds)
    const decision = evaluatePolicy(actor, 'admin:read')
    if (decision.allowed) return true

    this.opts.logger.warn({
      action: 'rbac.denied',
      actorId: actor.id,
      actorType: actor.type,
      attemptedAction: action,
      message: 'RBAC denied Telegram admin action',
      reason: decision.reason,
      requiredPermission: 'admin:read',
      roles: actor.roles,
      service: 'bot-gateway',
    })
    return false
  }

  /**
   * Запускает основной цикл получения Telegram updates.
   */
  async start(): Promise<void> {
    await this.opts.telegram.setMyCommands()
    this.offset = await this.opts.updateStore.readOffset()

    while (!this.stopping) {
      try {
        const updates = await this.opts.telegram.getUpdates(this.offset)
        if (this.stopping) break

        for (const update of updates) {
          if (this.stopping) break

          const nextOffset = update.update_id + 1
          this.offset = nextOffset

          const claimed = await this.opts.updateStore.claimUpdate(update.update_id)
          if (!claimed) {
            this.opts.metrics?.incrementCounter('metrix_telegram_duplicate_updates_total', { mode: 'polling' })
            await this.opts.updateStore.saveOffset(nextOffset)
            continue
          }

          await this.handleUpdate(update).catch((error: unknown) => {
            this.opts.logger.error({
              action: 'telegram.update',
              error,
              message: 'Telegram update handler failed',
              service: 'bot-gateway',
              updateId: update.update_id,
            })
          })
          await this.opts.updateStore.saveOffset(nextOffset)
        }
      } catch (error) {
        if (!this.stopping) {
          this.opts.logger.error({
            action: 'telegram.poll',
            error,
            message: 'Telegram polling failed',
            service: 'bot-gateway',
          })
          await wait(1500)
        }
      }
    }
  }

  /**
   * Обрабатывает update, пришедший через webhook boundary.
   */
  async handleWebhookUpdate(update: TelegramUpdate): Promise<void> {
    const nextOffset = update.update_id + 1
    const claimed = await this.opts.updateStore.claimUpdate(update.update_id)
    if (!claimed) {
      this.opts.metrics?.incrementCounter('metrix_telegram_duplicate_updates_total', { mode: 'webhook' })
      await this.opts.updateStore.saveOffset(nextOffset)
      return
    }

    await this.handleUpdate(update)
    await this.opts.updateStore.saveOffset(nextOffset)
  }

  /**
   * Останавливает polling loop после текущего Telegram getUpdates.
   */
  stop(): void {
    this.stopping = true
  }

  /**
   * Распределяет Telegram update между обработчиками сообщений, callback и платежей.
   */
  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const userId = update.message?.from?.id ?? update.callback_query?.from?.id
    if (userId && !(await this.opts.rateLimit(userId))) {
      const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id
      if (chatId) await this.opts.telegram.sendMessage(chatId, 'Too many requests. Please slow down.', {})
      return
    }

    if (update.message) {
      await this.handleMessage(update.message)
      return
    }
    if (update.pre_checkout_query) {
      const result = await this.opts.services.forwardPreCheckout(update.pre_checkout_query)
      await this.opts.telegram.answerPreCheckoutQuery(
        update.pre_checkout_query.id,
        result.ok ? { ok: true } : { ok: false, errorMessage: result.errorMessage ?? 'Payment failed.' },
      )
      return
    }
    if (update.callback_query) {
      await this.handleCallback(update.callback_query)
    }
  }

  /**
   * Обрабатывает текстовые команды и сообщения Telegram.
   */
  private async handleMessage(msg: TelegramMessage): Promise<void> {
    if (msg.successful_payment) {
      if (msg.from?.id) await this.opts.sessionStore.setState(msg.from.id, { state: 'START' })
      await this.opts.services.forwardSuccessfulPayment(msg)
      return
    }

    const text = msg.text?.trim()
    if (!text) return

    const chatId = msg.chat.id

    if (text === '/start') {
      if (msg.from?.id) await this.opts.sessionStore.setState(msg.from.id, { state: 'START' })
      await this.opts.telegram.sendMessage(chatId, welcomeMessage(msg.from?.first_name), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (text === '/help') {
      await this.opts.telegram.sendMessage(chatId, helpMessage(), { reply_markup: mainMenuKeyboard() })
      return
    }

    if (text === '/resume') {
      if (!msg.from?.id) return
      await this.sendRecoveredSession(chatId, msg.from.id)
      return
    }

    if (text === '/book' || text === '/slots') {
      if (msg.from?.id) await this.opts.sessionStore.setState(msg.from.id, { state: 'SELECT_LOCATION' })
      await this.sendLocations(chatId)
      return
    }

    if (text === '/my_bookings') {
      if (!msg.from?.id) return
      await this.sendBookings(chatId, msg.from.id)
      return
    }

    if (text === '/calendar') {
      if (!msg.from?.id) return
      await this.sendCalendarStatus(chatId, msg.from.id)
      return
    }

    if (text === '/stats') {
      if (!msg.from?.id || !this.canUseAdminFeaturesOrAuditDenied(msg.from.id, 'telegram.command.stats')) {
        await this.opts.telegram.sendMessage(chatId, 'Access denied.', {})
        return
      }
      await this.sendAdminStats(chatId)
      return
    }
  }

  /**
   * Обрабатывает inline callback-кнопки Telegram.
   */
  private async handleCallback(query: TelegramCallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id
    const messageId = query.message?.message_id
    const data = query.data

    if (!chatId || !messageId || !data) {
      await this.opts.telegram.answerCallbackQuery(query.id)
      return
    }

    await this.opts.telegram.answerCallbackQuery(query.id)
    const parsed = parseCallbackData(data)
    if (!parsed) {
      this.opts.logger.error({
        action: 'telegram.callback.invalid',
        callbackData: data,
        message: 'Invalid Telegram callback data',
        service: 'bot-gateway',
      })
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'start') {
      await this.opts.sessionStore.setState(query.from.id, { state: 'START' })
      await this.opts.telegram.editMessageText(chatId, messageId, welcomeMessage(query.from.first_name), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'help') {
      await this.opts.telegram.editMessageText(chatId, messageId, helpMessage(), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (parsed.type === 'menu' && (parsed.action === 'book' || parsed.action === 'slots')) {
      await this.opts.sessionStore.setState(query.from.id, { state: 'SELECT_LOCATION' })
      await this.editLocations(chatId, messageId)
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'bookings') {
      await this.editBookings(chatId, messageId, query.from.id)
      return
    }

    if (parsed.type === 'location') {
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: parsed.locationId,
        state: 'SELECT_ROOM',
      })
      await this.editResources(chatId, messageId, parsed.locationId)
      return
    }

    if (parsed.type === 'resource') {
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: parsed.locationId,
        resourceId: parsed.resourceId,
        state: 'SELECT_TIME',
      })
      await this.editSlots(chatId, messageId, parsed.locationId, parsed.resourceId)
      return
    }

    if (parsed.type === 'slot') {
      await this.opts.sessionStore.setState(query.from.id, {
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
        state: 'CONFIRM_BOOKING',
      })
      await this.editBookingPrompt(chatId, messageId, parsed.resourceId, parsed.slotId)
      return
    }

    if (parsed.type === 'confirm') {
      await this.opts.sessionStore.setState(query.from.id, {
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
        state: 'PAYMENT',
      })
      await this.opts.services.createInvoice({
        chatId,
        messageId,
        telegramUserId: query.from.id,
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
      })
      await this.opts.telegram.editMessageText(chatId, messageId, 'Invoice sent. Complete the payment in Telegram.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (parsed.type === 'cancel') {
      await this.opts.telegram.editMessageText(chatId, messageId, 'Are you sure?', {
        reply_markup: confirmCancelKeyboard(parsed.bookingId),
      })
      return
    }

    if (parsed.type === 'cancel_confirm') {
      const booking = await this.opts.services.cancelBooking(parsed.bookingId, query.from.id)
      const text = booking
        ? `Booking cancelled: ${booking.resourceName}, ${booking.startsAt} – ${booking.endsAt}.`
        : 'Booking not found.'
      await this.opts.telegram.editMessageText(chatId, messageId, text, { reply_markup: mainMenuKeyboard() })
      return
    }

    if (parsed.type === 'calendar_disconnect') {
      await this.opts.services.disconnectCalendar(parsed.provider, query.from.id)
      await this.editCalendarStatus(chatId, messageId, query.from.id)
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'stats') {
      if (!this.canUseAdminFeaturesOrAuditDenied(query.from.id, 'telegram.callback.stats')) {
        await this.opts.telegram.answerCallbackQuery(query.id)
        return
      }
      await this.editAdminStats(chatId, messageId)
      return
    }
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendLocations(chatId: number): Promise<void> {
    const locations = await this.opts.services.listLocations()
    await this.opts.telegram.sendMessage(chatId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  /**
   * Восстанавливает UI по текущему FSM state.
   */
  private async sendRecoveredSession(chatId: number, telegramUserId: number): Promise<void> {
    const session = await this.opts.sessionStore.getState(telegramUserId)
    if (!session || session.state === 'START') {
      await this.opts.telegram.sendMessage(chatId, welcomeMessage(), { reply_markup: mainMenuKeyboard() })
      return
    }

    if (session.state === 'SELECT_LOCATION') {
      await this.sendLocations(chatId)
      return
    }

    if (session.state === 'SELECT_ROOM' && session.locationId) {
      await this.sendResources(chatId, session.locationId)
      return
    }

    if (session.state === 'SELECT_TIME' && session.locationId && session.resourceId) {
      await this.sendSlots(chatId, session.resourceId)
      return
    }

    if (session.state === 'CONFIRM_BOOKING' && session.resourceId && session.slotId) {
      await this.sendBookingPrompt(chatId, session.resourceId, session.slotId)
      return
    }

    if (session.state === 'PAYMENT') {
      await this.opts.telegram.sendMessage(chatId, 'Invoice was sent. Complete the payment in Telegram or start again.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    await this.sendLocations(chatId)
  }

  /**
   * Отправляет комнаты выбранной локации.
   */
  private async sendResources(chatId: number, locationId: string): Promise<void> {
    const resources = await this.opts.services.listResources(locationId)
    await this.opts.telegram.sendMessage(chatId, resourcesMessage(resources), {
      reply_markup: resourceKeyboard(resources),
    })
  }

  /**
   * Отправляет слоты выбранного ресурса.
   */
  private async sendSlots(chatId: number, resourceId: string): Promise<void> {
    const resource = await this.opts.services.getResource(resourceId)
    const slots = await this.opts.services.listAvailableSlots(resourceId)
    await this.opts.telegram.sendMessage(chatId, slotsMessage(resource, slots), {
      reply_markup: slotsKeyboard(resource, slots),
    })
  }

  /**
   * Отправляет подтверждение бронирования по сохранённому FSM context.
   */
  private async sendBookingPrompt(chatId: number, resourceId: string, slotId: string): Promise<void> {
    const resource = await this.opts.services.getResource(resourceId)
    const slots = await this.opts.services.listAvailableSlots(resourceId)
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) {
      await this.opts.telegram.sendMessage(chatId, 'Slot is no longer available.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    await this.opts.telegram.sendMessage(chatId, bookingConfirmationPrompt(resource, slot), {
      reply_markup: confirmBookingKeyboard(resource, slotId),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editLocations(chatId: number, messageId: number): Promise<void> {
    const locations = await this.opts.services.listLocations()
    await this.opts.telegram.editMessageText(chatId, messageId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editResources(chatId: number, messageId: number, locationId: string): Promise<void> {
    const resources = await this.opts.services.listResources(locationId)
    await this.opts.telegram.editMessageText(chatId, messageId, resourcesMessage(resources), {
      reply_markup: resourceKeyboard(resources),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editSlots(chatId: number, messageId: number, locationId: string, resourceId: string): Promise<void> {
    const resource = await this.opts.services.getResource(resourceId)
    const slots = await this.opts.services.listAvailableSlots(resourceId)
    await this.opts.telegram.editMessageText(chatId, messageId, slotsMessage(resource, slots), {
      reply_markup: slotsKeyboard(resource, slots),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editBookingPrompt(chatId: number, messageId: number, resourceId: string, slotId: string): Promise<void> {
    const resource = await this.opts.services.getResource(resourceId)
    const slots = await this.opts.services.listAvailableSlots(resourceId)
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) {
      await this.opts.telegram.editMessageText(chatId, messageId, 'Slot is no longer available.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }
    await this.opts.telegram.editMessageText(chatId, messageId, bookingConfirmationPrompt(resource, slot), {
      reply_markup: confirmBookingKeyboard(resource, slotId),
    })
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendBookings(chatId: number, telegramUserId: number): Promise<void> {
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.sendMessage(chatId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editBookings(chatId: number, messageId: number, telegramUserId: number): Promise<void> {
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.editMessageText(chatId, messageId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendCalendarStatus(chatId: number, telegramUserId: number): Promise<void> {
    const connections = await this.opts.services.getUserCalendarConnections(telegramUserId)
    const connected = connections.map((c) => c.provider)
    const googleUrlResult = await this.opts.services.getCalendarAuthUrl({
      provider: 'google',
      telegramUserId,
      scope: 'user',
    })
    const googleUrl = googleUrlResult?.url

    if (connected.length > 0) {
      await this.opts.telegram.sendMessage(chatId, calendarStatusMessage(connected), {
        reply_markup: calendarStatusKeyboard({ connectedProviders: connected, googleUrl }),
      })
    } else {
      await this.opts.telegram.sendMessage(chatId, calendarAuthMessage({ googleUrl }), {
        reply_markup: googleUrl ? calendarAuthKeyboard(googleUrl) : mainMenuKeyboard(),
      })
    }
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendAdminStats(chatId: number): Promise<void> {
    try {
      const stats = await this.opts.services.getStats()
      const text = [
        '📊 *Stats*',
        `Total bookings: ${stats.total}`,
        `Active: ${stats.active}`,
        `Cancelled: ${stats.cancelled}`,
        `Revenue: ${(stats.revenue / 100).toFixed(2)} ₽`,
      ].join('\n')
      await this.opts.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      this.opts.logger.error({
        action: 'admin.stats',
        chatId,
        error,
        message: 'Failed to load admin stats',
        service: 'bot-gateway',
      })
      await this.opts.telegram.sendMessage(chatId, 'Failed to load stats.', {})
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editAdminStats(chatId: number, messageId: number): Promise<void> {
    try {
      const stats = await this.opts.services.getStats()
      const text = [
        '📊 *Stats*',
        `Total bookings: ${stats.total}`,
        `Active: ${stats.active}`,
        `Cancelled: ${stats.cancelled}`,
        `Revenue: ${(stats.revenue / 100).toFixed(2)} ₽`,
      ].join('\n')
      await this.opts.telegram.editMessageText(chatId, messageId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      this.opts.logger.error({
        action: 'admin.stats',
        chatId,
        error,
        message: 'Failed to edit admin stats',
        messageId,
        service: 'bot-gateway',
      })
      await this.opts.telegram.editMessageText(chatId, messageId, 'Failed to load stats.', {})
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editCalendarStatus(chatId: number, messageId: number, telegramUserId: number): Promise<void> {
    const connections = await this.opts.services.getUserCalendarConnections(telegramUserId)
    const connected = connections.map((c) => c.provider)
    const googleUrlResult = await this.opts.services.getCalendarAuthUrl({
      provider: 'google',
      telegramUserId,
      scope: 'user',
    })
    const googleUrl = googleUrlResult?.url

    if (connected.length > 0) {
      await this.opts.telegram.editMessageText(chatId, messageId, calendarStatusMessage(connected), {
        reply_markup: calendarStatusKeyboard({ connectedProviders: connected, googleUrl }),
      })
    } else {
      await this.opts.telegram.editMessageText(chatId, messageId, calendarAuthMessage({ googleUrl }), {
        reply_markup: googleUrl ? calendarAuthKeyboard(googleUrl) : mainMenuKeyboard(),
      })
    }
  }

}

/**
 * Возвращает Promise, который завершается после указанной паузы.
 */
function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
