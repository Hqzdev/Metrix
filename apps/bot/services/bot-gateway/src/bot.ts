import { createTelegramActor, evaluatePolicy } from '@metrix/rbac'
import type { MetricsRegistry } from '@metrix/observability'
import { ServiceHttpError, type ServicesClient } from './services-client.js'
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
  customBookingConfirmationPrompt,
  languagePromptMessage,
  type BotLanguage,
  helpMessage,
  locationsMessage,
  resourcesMessage,
  selectDateMessage,
  selectDurationMessage,
  selectTimeMessage,
  slotsMessage,
  welcomeMessage,
} from './messages.js'
import {
  bookingsKeyboard,
  calendarAuthKeyboard,
  calendarStatusKeyboard,
  confirmBookingKeyboard,
  confirmCancelKeyboard,
  confirmCustomBookingKeyboard,
  datePickerKeyboard,
  durationPickerKeyboard,
  languageKeyboard,
  locationKeyboard,
  mainMenuKeyboard,
  resourceKeyboard,
  slotsKeyboard,
  timePickerKeyboard,
} from './keyboards.js'
import { buildCustomSlotId } from '../../booking-service/src/slots.js'

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

  private async getSavedLanguage(telegramUserId: number): Promise<BotLanguage | null> {
    try {
      return await this.opts.services.getUserLanguage(telegramUserId)
    } catch (error) {
      this.opts.logger.warn({
        action: 'user.language.get',
        error,
        message: 'Failed to load Telegram user language',
        service: 'bot-gateway',
        telegramUserId,
      })
      return null
    }
  }

  private async getLanguage(telegramUserId: number): Promise<BotLanguage> {
    return (await this.getSavedLanguage(telegramUserId)) ?? 'en'
  }

  private async sendLanguagePrompt(chatId: number): Promise<void> {
    await this.opts.telegram.sendMessage(chatId, languagePromptMessage(), {
      reply_markup: languageKeyboard(),
    })
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
      const language = msg.from?.id ? await this.getSavedLanguage(msg.from.id) : null
      if (!language) {
        await this.sendLanguagePrompt(chatId)
        return
      }
      await this.opts.telegram.sendMessage(chatId, welcomeMessage(msg.from?.first_name, language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    if (text === '/help') {
      const language = msg.from?.id ? await this.getLanguage(msg.from.id) : 'en'
      await this.opts.telegram.sendMessage(chatId, helpMessage(language), { reply_markup: mainMenuKeyboard(language) })
      return
    }

    if (text === '/resume') {
      if (!msg.from?.id) return
      await this.sendRecoveredSession(chatId, msg.from.id)
      return
    }

    if (text === '/book' || text === '/slots') {
      if (msg.from?.id) await this.opts.sessionStore.setState(msg.from.id, { state: 'SELECT_LOCATION' })
      await this.sendLocations(chatId, msg.from?.id)
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

    if (parsed.type === 'language') {
      await this.opts.services.setUserLanguage(query.from.id, parsed.language)
      await this.opts.sessionStore.setState(query.from.id, { state: 'START' })
      await this.opts.telegram.editMessageText(chatId, messageId, welcomeMessage(query.from.first_name, parsed.language), {
        reply_markup: mainMenuKeyboard(parsed.language),
      })
      return
    }

    const language = await this.getLanguage(query.from.id)

    if (parsed.type === 'menu' && parsed.action === 'start') {
      await this.opts.sessionStore.setState(query.from.id, { state: 'START' })
      await this.opts.telegram.editMessageText(chatId, messageId, welcomeMessage(query.from.first_name, language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'help') {
      await this.opts.telegram.editMessageText(chatId, messageId, helpMessage(language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    if (parsed.type === 'menu' && (parsed.action === 'book' || parsed.action === 'slots')) {
      await this.opts.sessionStore.setState(query.from.id, { state: 'SELECT_LOCATION' })
      await this.editLocations(chatId, messageId, language)
      return
    }

    if (parsed.type === 'menu' && parsed.action === 'bookings') {
      await this.editBookings(chatId, messageId, query.from.id, language)
      return
    }

    if (parsed.type === 'location') {
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: parsed.locationId,
        state: 'SELECT_ROOM',
      })
      await this.editResources(chatId, messageId, parsed.locationId, language)
      return
    }

    if (parsed.type === 'resource') {
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: parsed.locationId,
        resourceId: parsed.resourceId,
        state: 'SELECT_DATE',
      })
      await this.editDatePicker(chatId, messageId, parsed.locationId, parsed.resourceId, language)
      return
    }

    if (parsed.type === 'date') {
      const session = await this.opts.sessionStore.getState(query.from.id)
      if (!session?.locationId || !session?.resourceId) {
        await this.opts.telegram.editMessageText(chatId, messageId, expiredSessionMessage(language), { reply_markup: mainMenuKeyboard(language) })
        return
      }
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: session.locationId,
        resourceId: session.resourceId,
        selectedDate: parsed.date,
        state: 'SELECT_START_TIME',
      })
      await this.editTimePicker(chatId, messageId, session.locationId, session.resourceId, parsed.date, language)
      return
    }

    if (parsed.type === 'time') {
      const session = await this.opts.sessionStore.getState(query.from.id)
      if (!session?.locationId || !session?.resourceId || !session?.selectedDate) {
        await this.opts.telegram.editMessageText(chatId, messageId, expiredSessionMessage(language), { reply_markup: mainMenuKeyboard(language) })
        return
      }
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: session.locationId,
        resourceId: session.resourceId,
        selectedDate: session.selectedDate,
        selectedHour: parsed.hour,
        state: 'SELECT_DURATION',
      })
      await this.editDurationPicker(chatId, messageId, session.locationId, session.resourceId, session.selectedDate, parsed.hour, language)
      return
    }

    if (parsed.type === 'dur') {
      const session = await this.opts.sessionStore.getState(query.from.id)
      if (!session?.locationId || !session?.resourceId || !session?.selectedDate || session.selectedHour === undefined) {
        await this.opts.telegram.editMessageText(chatId, messageId, expiredSessionMessage(language), { reply_markup: mainMenuKeyboard(language) })
        return
      }
      const slotId = buildCustomSlotId(session.resourceId, session.selectedDate, session.selectedHour, parsed.hours)
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: session.locationId,
        resourceId: session.resourceId,
        selectedDate: session.selectedDate,
        selectedDuration: parsed.hours,
        selectedHour: session.selectedHour,
        slotId,
        state: 'CONFIRM_BOOKING',
      })
      await this.editCustomBookingPrompt(chatId, messageId, session.locationId, session.resourceId, session.selectedDate, session.selectedHour, parsed.hours, language)
      return
    }

    if (parsed.type === 'confirm_custom') {
      const session = await this.opts.sessionStore.getState(query.from.id)
      if (!session?.resourceId || !session?.slotId) {
        await this.opts.telegram.editMessageText(chatId, messageId, expiredSessionMessage(language), { reply_markup: mainMenuKeyboard(language) })
        return
      }
      await this.opts.sessionStore.setState(query.from.id, {
        locationId: session.locationId,
        resourceId: session.resourceId,
        selectedDate: session.selectedDate,
        selectedDuration: session.selectedDuration,
        selectedHour: session.selectedHour,
        slotId: session.slotId,
        state: 'PAYMENT',
      })
      const invoiceCreated = await this.tryCreateInvoice({
        chatId,
        messageId,
        telegramUserId: query.from.id,
        resourceId: session.resourceId,
        slotId: session.slotId,
        language,
        retryCallbackData: session.locationId ? `resource:${session.locationId}:${session.resourceId}` : 'menu:book',
      })
      if (!invoiceCreated) return
      await this.opts.telegram.editMessageText(chatId, messageId, invoiceSentMessage(language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    if (parsed.type === 'slot') {
      await this.opts.sessionStore.setState(query.from.id, {
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
        state: 'CONFIRM_BOOKING',
      })
      await this.editBookingPrompt(chatId, messageId, parsed.resourceId, parsed.slotId, language)
      return
    }

    if (parsed.type === 'confirm') {
      await this.opts.sessionStore.setState(query.from.id, {
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
        state: 'PAYMENT',
      })
      const invoiceCreated = await this.tryCreateInvoice({
        chatId,
        messageId,
        telegramUserId: query.from.id,
        resourceId: parsed.resourceId,
        slotId: parsed.slotId,
        language,
        retryCallbackData: 'menu:book',
      })
      if (!invoiceCreated) return
      await this.opts.telegram.editMessageText(chatId, messageId, invoiceSentMessage(language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    if (parsed.type === 'cancel') {
      await this.opts.telegram.editMessageText(chatId, messageId, language === 'ru' ? 'Вы уверены?' : 'Are you sure?', {
        reply_markup: confirmCancelKeyboard(parsed.bookingId, language),
      })
      return
    }

    if (parsed.type === 'cancel_confirm') {
      const booking = await this.opts.services.cancelBooking(parsed.bookingId, query.from.id)
      const text = booking
        ? language === 'ru'
          ? `Бронирование отменено: ${booking.resourceName}, ${booking.startsAt} – ${booking.endsAt}.`
          : `Booking cancelled: ${booking.resourceName}, ${booking.startsAt} – ${booking.endsAt}.`
        : language === 'ru' ? 'Бронирование не найдено.' : 'Booking not found.'
      await this.opts.telegram.editMessageText(chatId, messageId, text, { reply_markup: mainMenuKeyboard(language) })
      return
    }

    if (parsed.type === 'calendar_disconnect') {
      await this.opts.services.disconnectCalendar(parsed.provider, query.from.id)
      await this.editCalendarStatus(chatId, messageId, query.from.id, language)
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
  private async tryCreateInvoice(input: {
    chatId: number
    language: BotLanguage
    messageId: number
    resourceId: string
    retryCallbackData: string
    slotId: string
    telegramUserId: number
  }): Promise<boolean> {
    try {
      await this.opts.services.createInvoice({
        chatId: input.chatId,
        messageId: input.messageId,
        telegramUserId: input.telegramUserId,
        resourceId: input.resourceId,
        slotId: input.slotId,
      })
      return true
    } catch (error) {
      if (error instanceof ServiceHttpError && error.statusCode === 409) {
        await this.opts.sessionStore.setState(input.telegramUserId, { state: 'SELECT_LOCATION' })
        await this.opts.telegram.editMessageText(input.chatId, input.messageId, slotHeldOrBookedMessage(input.language), {
          reply_markup: retryKeyboard(input.language, input.retryCallbackData),
        })
        return false
      }

      throw error
    }
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendLocations(chatId: number, telegramUserId?: number, languageOverride?: BotLanguage): Promise<void> {
    const language = languageOverride ?? (telegramUserId ? await this.getLanguage(telegramUserId) : 'en')
    try {
      const locations = await this.opts.services.listLocations()
      await this.opts.telegram.sendMessage(chatId, locationsMessage(locations, language), {
        reply_markup: locationKeyboard(locations, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendLocations')
      await this.sendTemporaryUnavailableMessage(chatId, language, 'menu:book')
    }
  }

  /**
   * Восстанавливает UI по текущему FSM state.
   */
  private async sendRecoveredSession(chatId: number, telegramUserId: number): Promise<void> {
    const language = await this.getLanguage(telegramUserId)
    const session = await this.opts.sessionStore.getState(telegramUserId)
    if (!session || session.state === 'START') {
      await this.opts.telegram.sendMessage(chatId, welcomeMessage(undefined, language), { reply_markup: mainMenuKeyboard(language) })
      return
    }

    if (session.state === 'SELECT_LOCATION') {
      await this.sendLocations(chatId, telegramUserId, language)
      return
    }

    if (session.state === 'SELECT_ROOM' && session.locationId) {
      await this.sendResources(chatId, session.locationId, language)
      return
    }

    if (session.state === 'SELECT_DATE' && session.locationId && session.resourceId) {
      await this.sendDatePicker(chatId, session.locationId, session.resourceId, language)
      return
    }

    if (session.state === 'SELECT_START_TIME' && session.locationId && session.resourceId && session.selectedDate) {
      await this.sendTimePicker(chatId, session.locationId, session.resourceId, session.selectedDate, language)
      return
    }

    if (
      session.state === 'SELECT_DURATION' &&
      session.locationId &&
      session.resourceId &&
      session.selectedDate &&
      session.selectedHour !== undefined
    ) {
      await this.sendDurationPicker(chatId, session.locationId, session.resourceId, session.selectedDate, session.selectedHour, language)
      return
    }

    if (session.state === 'SELECT_TIME' && session.locationId && session.resourceId) {
      await this.sendSlots(chatId, session.resourceId, language)
      return
    }

    if (session.state === 'CONFIRM_BOOKING' && session.resourceId && session.slotId) {
      await this.sendBookingPrompt(chatId, session.resourceId, session.slotId, language)
      return
    }

    if (session.state === 'PAYMENT') {
      await this.opts.telegram.sendMessage(chatId, invoiceRecoveryMessage(language), {
        reply_markup: mainMenuKeyboard(language),
      })
      return
    }

    await this.sendLocations(chatId, telegramUserId, language)
  }

  /**
   * Отправляет комнаты выбранной локации.
   */
  private async sendResources(chatId: number, locationId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resources = await this.opts.services.listResources(locationId)
      await this.opts.telegram.sendMessage(chatId, resourcesMessage(resources, language), {
        reply_markup: resourceKeyboard(resources, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendResources')
      await this.sendTemporaryUnavailableMessage(chatId, language, `location:${locationId}`)
    }
  }

  /**
   * Отправляет слоты выбранного ресурса.
   */
  private async sendSlots(chatId: number, resourceId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      const slots = await this.opts.services.listAvailableSlots(resourceId)
      await this.opts.telegram.sendMessage(chatId, slotsMessage(resource, slots, language), {
        reply_markup: slotsKeyboard(resource, slots, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendSlots')
      await this.sendTemporaryUnavailableMessage(chatId, language)
    }
  }

  /**
   * Отправляет подтверждение бронирования по сохранённому FSM context.
   */
  private async sendBookingPrompt(chatId: number, resourceId: string, slotId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      const slots = await this.opts.services.listAvailableSlots(resourceId)
      const slot = slots.find((s) => s.id === slotId)
      if (!slot) {
        await this.opts.telegram.sendMessage(chatId, slotUnavailableMessage(language), {
          reply_markup: mainMenuKeyboard(language),
        })
        return
      }

      await this.opts.telegram.sendMessage(chatId, bookingConfirmationPrompt(resource, slot, language), {
        reply_markup: confirmBookingKeyboard(resource, slotId, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendBookingPrompt')
      await this.sendTemporaryUnavailableMessage(chatId, language, `slot:${resourceId}:${slotId}`)
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editLocations(chatId: number, messageId: number, language: BotLanguage = 'en'): Promise<void> {
    try {
      const locations = await this.opts.services.listLocations()
      await this.opts.telegram.editMessageText(chatId, messageId, locationsMessage(locations, language), {
        reply_markup: locationKeyboard(locations, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editLocations')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, 'menu:book')
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editResources(chatId: number, messageId: number, locationId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resources = await this.opts.services.listResources(locationId)
      await this.opts.telegram.editMessageText(chatId, messageId, resourcesMessage(resources, language), {
        reply_markup: resourceKeyboard(resources, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editResources')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `location:${locationId}`)
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editSlots(chatId: number, messageId: number, locationId: string, resourceId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      const slots = await this.opts.services.listAvailableSlots(resourceId)
      await this.opts.telegram.editMessageText(chatId, messageId, slotsMessage(resource, slots, language), {
        reply_markup: slotsKeyboard(resource, slots, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editSlots')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `resource:${locationId}:${resourceId}`)
    }
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editBookingPrompt(chatId: number, messageId: number, resourceId: string, slotId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      const slots = await this.opts.services.listAvailableSlots(resourceId)
      const slot = slots.find((s) => s.id === slotId)
      if (!slot) {
        await this.opts.telegram.editMessageText(chatId, messageId, slotUnavailableMessage(language), {
          reply_markup: mainMenuKeyboard(language),
        })
        return
      }
      await this.opts.telegram.editMessageText(chatId, messageId, bookingConfirmationPrompt(resource, slot, language), {
        reply_markup: confirmBookingKeyboard(resource, slotId, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editBookingPrompt')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `slot:${resourceId}:${slotId}`)
    }
  }

  // ─── date / time picker methods ──────────────────────────────────────────────

  private async sendDatePicker(chatId: number, locationId: string, resourceId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.sendMessage(chatId, selectDateMessage(resource, language), {
        reply_markup: datePickerKeyboard(locationId, resourceId, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendDatePicker')
      await this.sendTemporaryUnavailableMessage(chatId, language, `resource:${locationId}:${resourceId}`)
    }
  }

  private async sendTimePicker(chatId: number, locationId: string, resourceId: string, dateStr: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.sendMessage(chatId, selectTimeMessage(resource, dateStr, language), {
        reply_markup: timePickerKeyboard(locationId, resourceId, dateStr, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendTimePicker')
      await this.sendTemporaryUnavailableMessage(chatId, language, `date:${dateStr}`)
    }
  }

  private async sendDurationPicker(chatId: number, locationId: string, resourceId: string, dateStr: string, hour: number, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.sendMessage(chatId, selectDurationMessage(resource, dateStr, hour, language), {
        reply_markup: durationPickerKeyboard(hour, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'sendDurationPicker')
      await this.sendTemporaryUnavailableMessage(chatId, language, `time:${hour}`)
    }
  }

  /**
   * Показывает inline-клавиатуру выбора даты.
   */
  private async editDatePicker(chatId: number, messageId: number, locationId: string, resourceId: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.editMessageText(chatId, messageId, selectDateMessage(resource, language), {
        reply_markup: datePickerKeyboard(locationId, resourceId, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editDatePicker')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `resource:${locationId}:${resourceId}`)
    }
  }

  /**
   * Показывает inline-клавиатуру выбора часа начала.
   */
  private async editTimePicker(chatId: number, messageId: number, locationId: string, resourceId: string, dateStr: string, language: BotLanguage = 'en'): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.editMessageText(chatId, messageId, selectTimeMessage(resource, dateStr, language), {
        reply_markup: timePickerKeyboard(locationId, resourceId, dateStr, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editTimePicker')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `date:${dateStr}`)
    }
  }

  /**
   * Показывает inline-клавиатуру выбора продолжительности.
   */
  private async editDurationPicker(
    chatId: number,
    messageId: number,
    locationId: string,
    resourceId: string,
    dateStr: string,
    hour: number,
    language: BotLanguage = 'en',
  ): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.editMessageText(chatId, messageId, selectDurationMessage(resource, dateStr, hour, language), {
        reply_markup: durationPickerKeyboard(hour, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editDurationPicker')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `time:${hour}`)
    }
  }

  /**
   * Показывает экран подтверждения брони с произвольным временем.
   */
  private async editCustomBookingPrompt(
    chatId: number,
    messageId: number,
    locationId: string,
    resourceId: string,
    dateStr: string,
    hour: number,
    duration: number,
    language: BotLanguage = 'en',
  ): Promise<void> {
    try {
      const resource = await this.opts.services.getResource(resourceId)
      await this.opts.telegram.editMessageText(chatId, messageId, customBookingConfirmationPrompt(resource, dateStr, hour, duration, language), {
        reply_markup: confirmCustomBookingKeyboard(locationId, resourceId, language),
      })
    } catch (error) {
      this.logBookingUiUnavailable(error, 'editCustomBookingPrompt')
      await this.editTemporaryUnavailableMessage(chatId, messageId, language, `resource:${locationId}:${resourceId}`)
    }
  }

  private async sendTemporaryUnavailableMessage(chatId: number, language: BotLanguage = 'en', retryCallbackData?: string): Promise<void> {
    await this.opts.telegram.sendMessage(chatId, serviceTemporarilyUnavailableMessage(language), {
      reply_markup: retryKeyboard(language, retryCallbackData),
    })
  }

  private async editTemporaryUnavailableMessage(chatId: number, messageId: number, language: BotLanguage = 'en', retryCallbackData?: string): Promise<void> {
    await this.opts.telegram.editMessageText(chatId, messageId, serviceTemporarilyUnavailableMessage(language), {
      reply_markup: retryKeyboard(language, retryCallbackData),
    })
  }

  private logBookingUiUnavailable(error: unknown, action: string): void {
    this.opts.logger.warn({
      action,
      error,
      message: 'Booking UI dependency is temporarily unavailable',
      service: 'bot-gateway',
    })
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendBookings(chatId: number, telegramUserId: number): Promise<void> {
    const language = await this.getLanguage(telegramUserId)
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.sendMessage(chatId, bookingsMessage(bookings, language), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings, language) : mainMenuKeyboard(language),
    })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  private async editBookings(chatId: number, messageId: number, telegramUserId: number, languageOverride?: BotLanguage): Promise<void> {
    const language = languageOverride ?? await this.getLanguage(telegramUserId)
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.editMessageText(chatId, messageId, bookingsMessage(bookings, language), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings, language) : mainMenuKeyboard(language),
    })
  }

  /**
   * Отправляет данные пользователю или во внешний API.
   */
  private async sendCalendarStatus(chatId: number, telegramUserId: number): Promise<void> {
    const language = await this.getLanguage(telegramUserId)
    const connections = await this.opts.services.getUserCalendarConnections(telegramUserId)
    const connected = connections.map((c) => c.provider)
    const googleUrlResult = await this.opts.services.getCalendarAuthUrl({
      provider: 'google',
      telegramUserId,
      scope: 'user',
    })
    const googleUrl = googleUrlResult?.url

    if (connected.length > 0) {
      await this.opts.telegram.sendMessage(chatId, calendarStatusMessage(connected, language), {
        reply_markup: calendarStatusKeyboard({ connectedProviders: connected, googleUrl }, language),
      })
    } else {
      await this.opts.telegram.sendMessage(chatId, calendarAuthMessage({ googleUrl }, language), {
        reply_markup: googleUrl ? calendarAuthKeyboard(googleUrl, language) : mainMenuKeyboard(language),
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
  private async editCalendarStatus(chatId: number, messageId: number, telegramUserId: number, languageOverride?: BotLanguage): Promise<void> {
    const language = languageOverride ?? await this.getLanguage(telegramUserId)
    const connections = await this.opts.services.getUserCalendarConnections(telegramUserId)
    const connected = connections.map((c) => c.provider)
    const googleUrlResult = await this.opts.services.getCalendarAuthUrl({
      provider: 'google',
      telegramUserId,
      scope: 'user',
    })
    const googleUrl = googleUrlResult?.url

    if (connected.length > 0) {
      await this.opts.telegram.editMessageText(chatId, messageId, calendarStatusMessage(connected, language), {
        reply_markup: calendarStatusKeyboard({ connectedProviders: connected, googleUrl }, language),
      })
    } else {
      await this.opts.telegram.editMessageText(chatId, messageId, calendarAuthMessage({ googleUrl }, language), {
        reply_markup: googleUrl ? calendarAuthKeyboard(googleUrl, language) : mainMenuKeyboard(language),
      })
    }
  }

}

function expiredSessionMessage(language: BotLanguage): string {
  return language === 'ru' ? 'Сессия устарела. Начните заново.' : 'Session expired. Please start again.'
}

function invoiceRecoveryMessage(language: BotLanguage): string {
  return language === 'ru'
    ? 'Счёт уже отправлен. Завершите оплату в Telegram или начните заново.'
    : 'Invoice was sent. Complete the payment in Telegram or start again.'
}

function invoiceSentMessage(language: BotLanguage): string {
  return language === 'ru' ? 'Счёт отправлен. Завершите оплату в Telegram.' : 'Invoice sent. Complete the payment in Telegram.'
}

function slotUnavailableMessage(language: BotLanguage): string {
  return language === 'ru' ? 'Слот больше недоступен.' : 'Slot is no longer available.'
}

function slotHeldOrBookedMessage(language: BotLanguage): string {
  return language === 'ru'
    ? 'Этот слот уже удерживается или забронирован. Выберите другое время.'
    : 'This slot is already held or booked. Please choose another time.'
}

function serviceTemporarilyUnavailableMessage(language: BotLanguage): string {
  return language === 'ru'
    ? ['Сервис бронирования запускается или временно недоступен.', '', 'Попробуйте ещё раз через несколько секунд.'].join('\n')
    : ['Booking service is starting or temporarily unavailable.', '', 'Please try again in a few seconds.'].join('\n')
}

function retryKeyboard(language: BotLanguage, retryCallbackData?: string) {
  if (!retryCallbackData) return mainMenuKeyboard(language)

  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Попробовать ещё раз' : 'Try again', callback_data: retryCallbackData }],
      [{ text: language === 'ru' ? 'Назад в меню' : 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

/**
 * Возвращает Promise, который завершается после указанной паузы.
 */
function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
