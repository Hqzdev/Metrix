import {
  bookingsKeyboard,
  confirmBookingKeyboard,
  confirmCancelKeyboard,
  locationKeyboard,
  mainMenuKeyboard,
  resourceKeyboard,
  slotsKeyboard,
} from './keyboards.js'
import {
  bookingConfirmationPrompt,
  bookingsMessage,
  calendarAuthMessage,
  calendarConnectedMessage,
  helpMessage,
  locationsMessage,
  resourcesMessage,
  slotsMessage,
  welcomeMessage,
} from './messages.js'
import { AdminController } from './admin-controller.js'
import { PaymentController } from './payment-controller.js'
import type { CalendarIntegrationService } from '../integrations/calendar/calendar-integration-service.js'
import type { CalendarProvider } from '../integrations/calendar/types.js'
import { handleHelpCommand, handleStartCommand } from '../commands/command-handlers.js'
import type { Logger } from '../lib/logger.js'
import type { TelegramClient } from '../lib/telegram-client.js'
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
} from '../lib/telegram-types.js'
import type {
  AvailableSlot,
  BookingLocation,
  BookingResource,
  BookingService,
} from '../services/booking-service.js'

type CreateBotOptions = {
  adminTelegramIds: number[]
  bookingService: BookingService
  calendarIntegration?: CalendarIntegrationService
  logger: Logger
  payment: PaymentConfig
  telegram: TelegramClient
}

type PaymentConfig = {
  currency: string
  providerToken: string
}

// создаёт экземпляр бота и возвращает метод запуска
export function createBot(options: CreateBotOptions): { start(): Promise<void> } {
  const app = new BotApp(options)

  return {
    start: () => app.start(),
  }
}

class BotApp {
  private readonly adminController: AdminController
  private readonly paymentController: PaymentController
  private updateOffset: number | undefined

  constructor(private readonly options: CreateBotOptions) {
    this.adminController = new AdminController({
      adminTelegramIds: options.adminTelegramIds,
      bookingService: options.bookingService,
      logger: options.logger,
      paymentCurrency: options.payment.currency,
      telegram: options.telegram,
    })
    this.paymentController = new PaymentController({
      adminTelegramIds: options.adminTelegramIds,
      bookingService: options.bookingService,
      calendarIntegration: options.calendarIntegration,
      currency: options.payment.currency,
      logger: options.logger,
      providerToken: options.payment.providerToken,
      telegram: options.telegram,
    })
  }

  // регистрирует команды и запускает long polling
  async start(): Promise<void> {
    await this.paymentController.initialize()
    await this.options.telegram.setMyCommands()
    this.options.logger.info('Telegram bot started')

    while (true) {
      await this.pollOnce()
    }
  }

  // выполняет один цикл опроса обновлений
  private async pollOnce(): Promise<void> {
    try {
      const updates = await this.options.telegram.getUpdates({
        offset: this.updateOffset,
        timeoutSeconds: 25,
      })

      for (const update of updates) {
        this.updateOffset = update.update_id + 1
        await this.handleUpdate(update)
      }
    } catch (error) {
      this.options.logger.error('Failed to poll Telegram updates', { error })
      await wait(1500)
    }
  }

  // маршрутизирует обновление по типу
  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message)
      return
    }

    if (update.pre_checkout_query) {
      await this.paymentController.handlePreCheckoutQuery(update.pre_checkout_query)
      return
    }

    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query)
    }
  }

  // обрабатывает входящее сообщение и команды
  private async handleMessage(message: TelegramMessage): Promise<void> {
    if (message.successful_payment) {
      await this.paymentController.handleSuccessfulPayment(message)
      return
    }

    const text = message.text?.trim()

    if (!text) {
      await this.options.telegram.sendMessage(message.chat.id, 'Send /start to open the menu.')
      return
    }

    if (text === '/start') {
      await handleStartCommand({ message, telegram: this.options.telegram })
      return
    }

    if (text === '/help') {
      await handleHelpCommand({ message, telegram: this.options.telegram })
      return
    }

    if (text === '/calendar') {
      await this.showCalendarAuth(message)
      return
    }

    if (text.startsWith('/connect_google') || text.startsWith('/connect_outlook')) {
      await this.connectCalendar(message, text)
      return
    }

    if (text === '/admin') {
      await this.adminController.showMenu(message)
      return
    }

    if (message.from?.id && this.adminController.hasPendingEdit(message.from.id)) {
      await this.adminController.handleEditMessage(message, text)
      return
    }

    if (text === '/book' || text === '/slots') {
      await this.showLocations(message.chat.id)
      return
    }

    if (text === '/my_bookings') {
      await this.showBookings(message.chat.id, message.from?.id)
      return
    }

    await this.options.telegram.sendMessage(message.chat.id, 'I did not understand that yet.', {
      reply_markup: mainMenuKeyboard(),
    })
  }

  // маршрутизирует нажатие inline-кнопки
  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id
    const messageId = query.message?.message_id
    const data = query.data

    if (!chatId || !messageId || !data) {
      await this.options.telegram.answerCallbackQuery(query.id)
      return
    }

    await this.options.telegram.answerCallbackQuery(query.id)

    if (data.startsWith('admin:')) {
      await this.adminController.handleCallback(chatId, messageId, query.from.id, data)
      return
    }

    if (data === 'menu:start') {
      await this.options.telegram.editMessageText(chatId, messageId, welcomeMessage(query.from.first_name), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data === 'menu:help') {
      await this.options.telegram.editMessageText(chatId, messageId, helpMessage(), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data === 'menu:book' || data === 'menu:slots') {
      await this.editLocations(chatId, messageId)
      return
    }

    if (data.startsWith('location:')) {
      await this.editResources(chatId, messageId, data.replace('location:', ''))
      return
    }

    if (data === 'menu:bookings') {
      await this.editBookings(chatId, messageId, query.from.id)
      return
    }

    if (data.startsWith('resource:')) {
      const parsed = parseLocationResourceData(data)
      await this.editSlots(chatId, messageId, parsed.locationId, parsed.resourceId)
      return
    }

    if (data.startsWith('slot:')) {
      await this.editBookingPrompt(chatId, messageId, data)
      return
    }

    if (data.startsWith('confirm:')) {
      await this.paymentController.confirmBooking(chatId, messageId, query.from.id, data)
      return
    }

    if (data.startsWith('cancel_confirm:')) {
      await this.confirmCancel(chatId, messageId, query.from.id, data.replace('cancel_confirm:', ''))
      return
    }

    if (data.startsWith('cancel:')) {
      await this.options.telegram.editMessageText(chatId, messageId, 'Are you sure?', {
        reply_markup: confirmCancelKeyboard(data.replace('cancel:', '')),
      })
    }
  }

  // отправляет список локаций новым сообщением
  private async showLocations(chatId: number): Promise<void> {
    const locations = await this.options.bookingService.listLocations()

    await this.options.telegram.sendMessage(chatId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  // обновляет сообщение со списком локаций
  private async editLocations(chatId: number, messageId: number): Promise<void> {
    const locations = await this.options.bookingService.listLocations()

    await this.options.telegram.editMessageText(chatId, messageId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  // обновляет сообщение со списком ресурсов выбранной локации
  private async editResources(chatId: number, messageId: number, locationId: string): Promise<void> {
    const location = await this.findLocation(locationId)
    const resources = await this.options.bookingService.listResources(locationId)

    await this.options.telegram.editMessageText(chatId, messageId, `${location.name}\n\n${resourcesMessage(resources)}`, {
      reply_markup: resourceKeyboard(resources),
    })
  }

  // обновляет сообщение со списком доступных слотов
  private async editSlots(chatId: number, messageId: number, locationId: string, resourceId: string): Promise<void> {
    const resource = await this.findResource(locationId, resourceId)
    await this.options.calendarIntegration?.syncBusySlotsForResource(resourceId)
    const slots = await this.options.bookingService.listAvailableSlots(resourceId)

    await this.options.telegram.editMessageText(chatId, messageId, slotsMessage(resource, slots), {
      reply_markup: slotsKeyboard(resource, slots),
    })
  }

  // обновляет сообщение с экраном подтверждения бронирования
  private async editBookingPrompt(chatId: number, messageId: number, data: string): Promise<void> {
    const parsed = parseResourceSlotData(data, 'slot')
    const resource = await this.findResourceById(parsed.resourceId)
    const slot = await this.findSlot(parsed.resourceId, parsed.slotId)

    await this.options.telegram.editMessageText(chatId, messageId, bookingConfirmationPrompt(resource, slot), {
      reply_markup: confirmBookingKeyboard(resource, parsed.slotId),
    })
  }

  // отправляет список активных бронирований пользователя
  private async showBookings(chatId: number, telegramUserId?: number): Promise<void> {
    if (!telegramUserId) {
      await this.options.telegram.sendMessage(chatId, 'Open this bot from your Telegram account first.')
      return
    }

    const bookings = await this.options.bookingService.listUserBookings(telegramUserId)

    await this.options.telegram.sendMessage(chatId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

  // обновляет сообщение со списком бронирований
  private async editBookings(chatId: number, messageId: number, telegramUserId: number): Promise<void> {
    const bookings = await this.options.bookingService.listUserBookings(telegramUserId)

    await this.options.telegram.editMessageText(chatId, messageId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

  // выполняет отмену бронирования и обновляет сообщение
  private async confirmCancel(
    chatId: number,
    messageId: number,
    telegramUserId: number,
    bookingId: string,
  ): Promise<void> {
    const booking = await this.options.bookingService.cancelBooking({ bookingId, telegramUserId })
    if (booking) {
      await this.options.calendarIntegration?.deleteEventsForBooking(booking)
    }
    const message = booking
      ? `Booking cancelled: ${booking.resourceName}, ${booking.startsAt} - ${booking.endsAt}.`
      : 'This booking was not found.'

    await this.options.telegram.editMessageText(chatId, messageId, message, {
      reply_markup: mainMenuKeyboard(),
    })
  }

  private async showCalendarAuth(message: TelegramMessage): Promise<void> {
    if (!message.from?.id || !this.options.calendarIntegration) {
      await this.options.telegram.sendMessage(message.chat.id, 'Calendar integrations are not configured.')
      return
    }

    const googleUrl = tryCreateCalendarAuthUrl(this.options.calendarIntegration, {
      provider: 'google',
      scope: 'user',
      telegramUserId: message.from.id,
    })
    const microsoftUrl = tryCreateCalendarAuthUrl(this.options.calendarIntegration, {
      provider: 'microsoft',
      scope: 'user',
      telegramUserId: message.from.id,
    })

    await this.options.telegram.sendMessage(message.chat.id, calendarAuthMessage({ googleUrl, microsoftUrl }))
  }

  private async connectCalendar(message: TelegramMessage, text: string): Promise<void> {
    if (!message.from?.id || !this.options.calendarIntegration) {
      await this.options.telegram.sendMessage(message.chat.id, 'Calendar integrations are not configured.')
      return
    }

    const [command, maybeResourceId, maybeCode] = text.split(/\s+/)
    const provider = command === '/connect_google' ? 'google' : 'microsoft'
    const resourceId = maybeCode ? maybeResourceId : undefined
    const code = maybeCode ?? maybeResourceId

    if (!code) {
      await this.options.telegram.sendMessage(message.chat.id, `Usage: ${command} <code> or ${command} <resourceId> <code>`)
      return
    }

    const scope = resourceId ? 'resource' : 'user'
    const connection = await this.options.calendarIntegration.connect({
      code,
      provider,
      resourceId,
      scope,
      telegramUserId: message.from.id,
    })

    await this.options.telegram.sendMessage(
      message.chat.id,
      calendarConnectedMessage(connection.provider, connection.scope, connection.resourceId),
      { reply_markup: mainMenuKeyboard() },
    )
  }

  // ищет локацию по идентификатору
  private async findLocation(locationId: string): Promise<BookingLocation> {
    const locations = await this.options.bookingService.listLocations()
    const location = locations.find((item) => item.id === locationId)

    if (!location) {
      throw new Error('Location was not found.')
    }

    return location
  }

  // ищет ресурс по идентификаторам локации и ресурса
  private async findResource(locationId: string, resourceId: string): Promise<BookingResource> {
    const resources = await this.options.bookingService.listResources(locationId)
    const resource = resources.find((item) => item.id === resourceId)

    if (!resource) {
      throw new Error('Resource was not found.')
    }

    return resource
  }

  // ищет ресурс по идентификатору во всех локациях
  private async findResourceById(resourceId: string): Promise<BookingResource> {
    const locations = await this.options.bookingService.listLocations()

    for (const location of locations) {
      const resource = (await this.options.bookingService.listResources(location.id)).find(
        (item) => item.id === resourceId,
      )

      if (resource) {
        return resource
      }
    }

    throw new Error('Resource was not found.')
  }

  // ищет слот по идентификаторам ресурса и слота
  private async findSlot(resourceId: string, slotId: string): Promise<AvailableSlot> {
    const slots = await this.options.bookingService.listAvailableSlots(resourceId)
    const slot = slots.find((item) => item.id === slotId)

    if (!slot) {
      throw new Error('Slot was not found.')
    }

    return slot
  }
}

// парсит callback_data для слота или подтверждения бронирования
function parseResourceSlotData(data: string, prefix: 'slot' | 'confirm'): { resourceId: string; slotId: string } {
  const [receivedPrefix, resourceId, slotId] = data.split(':')

  if (receivedPrefix !== prefix || !resourceId || !slotId) {
    throw new Error('Invalid callback payload.')
  }

  return { resourceId, slotId }
}

// парсит callback_data для ресурса внутри локации
function parseLocationResourceData(data: string): { locationId: string; resourceId: string } {
  const [prefix, locationId, resourceId] = data.split(':')

  if (prefix !== 'resource' || !locationId || !resourceId) {
    throw new Error('Invalid callback payload.')
  }

  return { locationId, resourceId }
}

function tryCreateCalendarAuthUrl(
  calendarIntegration: CalendarIntegrationService,
  input: { provider: CalendarProvider; scope: 'resource' | 'user'; telegramUserId: number },
): string | undefined {
  try {
    return calendarIntegration.createAuthorizationUrl(input)
  } catch {
    return undefined
  }
}

// ожидает указанное количество миллисекунд
function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}
