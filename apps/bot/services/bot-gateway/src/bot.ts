import type { ServicesClient } from './services-client.js'
import type { TelegramClient } from './telegram-client.js'
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './telegram-types.js'
import {
  bookingConfirmationPrompt,
  bookingsMessage,
  bookingCreatedMessage,
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
  services: ServicesClient
  telegram: TelegramClient
}

class RateLimiter {
  private readonly buckets = new Map<number, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  isAllowed(userId: number): boolean {
    const now = Date.now()
    const hits = (this.buckets.get(userId) ?? []).filter((t) => now - t < this.windowMs)
    if (hits.length >= this.limit) return false
    hits.push(now)
    this.buckets.set(userId, hits)
    if (this.buckets.size > 10_000) {
      for (const [id, timestamps] of this.buckets) {
        if (timestamps.every((t) => now - t >= this.windowMs)) this.buckets.delete(id)
      }
    }
    return true
  }
}

export class Bot {
  private offset: number | undefined
  private readonly handled = new Set<number>()
  private readonly rateLimiter = new RateLimiter(10, 10_000)

  constructor(private readonly opts: BotOptions) {}

  async start(): Promise<void> {
    await this.opts.telegram.setMyCommands()

    while (true) {
      try {
        const updates = await this.opts.telegram.getUpdates(this.offset)
        for (const update of updates) {
          this.offset = update.update_id + 1
          if (this.handled.has(update.update_id)) continue
          this.trackHandled(update.update_id)
          await this.handleUpdate(update).catch((err: unknown) =>
            console.error('update handler failed', { err }),
          )
        }
      } catch (err) {
        console.error('poll failed', { err })
        await wait(1500)
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const userId = update.message?.from?.id ?? update.callback_query?.from?.id
    if (userId && !this.rateLimiter.isAllowed(userId)) {
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

  private async handleMessage(msg: TelegramMessage): Promise<void> {
    if (msg.successful_payment) {
      await this.opts.services.forwardSuccessfulPayment(msg)
      return
    }

    const text = msg.text?.trim()
    if (!text) return

    const chatId = msg.chat.id

    if (text === '/start') {
      await this.opts.telegram.sendMessage(chatId, welcomeMessage(msg.from?.first_name), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (text === '/help') {
      await this.opts.telegram.sendMessage(chatId, helpMessage(), { reply_markup: mainMenuKeyboard() })
      return
    }

    if (text === '/book' || text === '/slots') {
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
  }

  private async handleCallback(query: TelegramCallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id
    const messageId = query.message?.message_id
    const data = query.data

    if (!chatId || !messageId || !data) {
      await this.opts.telegram.answerCallbackQuery(query.id)
      return
    }

    await this.opts.telegram.answerCallbackQuery(query.id)

    if (data === 'menu:start') {
      await this.opts.telegram.editMessageText(chatId, messageId, welcomeMessage(query.from.first_name), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data === 'menu:help') {
      await this.opts.telegram.editMessageText(chatId, messageId, helpMessage(), {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data === 'menu:book' || data === 'menu:slots') {
      await this.editLocations(chatId, messageId)
      return
    }

    if (data === 'menu:bookings') {
      await this.editBookings(chatId, messageId, query.from.id)
      return
    }

    if (data.startsWith('location:')) {
      await this.editResources(chatId, messageId, data.slice('location:'.length))
      return
    }

    if (data.startsWith('resource:')) {
      const [, locationId, resourceId] = data.split(':')
      await this.editSlots(chatId, messageId, locationId, resourceId)
      return
    }

    if (data.startsWith('slot:')) {
      await this.editBookingPrompt(chatId, messageId, data)
      return
    }

    if (data.startsWith('confirm:')) {
      const [, resourceId, slotId] = data.split(':')
      await this.opts.services.createInvoice({ chatId, messageId, telegramUserId: query.from.id, resourceId, slotId })
      await this.opts.telegram.editMessageText(chatId, messageId, 'Invoice sent. Complete the payment in Telegram.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data.startsWith('cancel:')) {
      const bookingId = data.slice('cancel:'.length)
      await this.opts.telegram.editMessageText(chatId, messageId, 'Are you sure?', {
        reply_markup: confirmCancelKeyboard(bookingId),
      })
      return
    }

    if (data.startsWith('cancel_confirm:')) {
      const bookingId = data.slice('cancel_confirm:'.length)
      const booking = await this.opts.services.cancelBooking(bookingId, query.from.id)
      const text = booking
        ? `Booking cancelled: ${booking.resourceName}, ${booking.startsAt} – ${booking.endsAt}.`
        : 'Booking not found.'
      await this.opts.telegram.editMessageText(chatId, messageId, text, { reply_markup: mainMenuKeyboard() })
      return
    }

    if (data.startsWith('calendar:disconnect:')) {
      const provider = data.slice('calendar:disconnect:'.length)
      await this.opts.services.disconnectCalendar(provider, query.from.id)
      await this.editCalendarStatus(chatId, messageId, query.from.id)
      return
    }
  }

  private async sendLocations(chatId: number): Promise<void> {
    const locations = await this.opts.services.listLocations()
    await this.opts.telegram.sendMessage(chatId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  private async editLocations(chatId: number, messageId: number): Promise<void> {
    const locations = await this.opts.services.listLocations()
    await this.opts.telegram.editMessageText(chatId, messageId, locationsMessage(locations), {
      reply_markup: locationKeyboard(locations),
    })
  }

  private async editResources(chatId: number, messageId: number, locationId: string): Promise<void> {
    const resources = await this.opts.services.listResources(locationId)
    await this.opts.telegram.editMessageText(chatId, messageId, resourcesMessage(resources), {
      reply_markup: resourceKeyboard(resources),
    })
  }

  private async editSlots(chatId: number, messageId: number, locationId: string, resourceId: string): Promise<void> {
    const resource = await this.opts.services.getResource(resourceId)
    const slots = await this.opts.services.listAvailableSlots(resourceId)
    await this.opts.telegram.editMessageText(chatId, messageId, slotsMessage(resource, slots), {
      reply_markup: slotsKeyboard(resource, slots),
    })
  }

  private async editBookingPrompt(chatId: number, messageId: number, data: string): Promise<void> {
    const [, resourceId, slotId] = data.split(':')
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

  private async sendBookings(chatId: number, telegramUserId: number): Promise<void> {
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.sendMessage(chatId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

  private async editBookings(chatId: number, messageId: number, telegramUserId: number): Promise<void> {
    const bookings = await this.opts.services.listUserBookings(telegramUserId)
    await this.opts.telegram.editMessageText(chatId, messageId, bookingsMessage(bookings), {
      reply_markup: bookings.length > 0 ? bookingsKeyboard(bookings) : mainMenuKeyboard(),
    })
  }

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

  private trackHandled(updateId: number): void {
    this.handled.add(updateId)
    if (this.handled.size > 1000) {
      const first = this.handled.values().next().value as number | undefined
      if (first !== undefined) this.handled.delete(first)
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
