import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { bookingCalendarKeyboard, mainMenuKeyboard } from './keyboards.js'
import {
  bookingCreatedMessage,
  bookingInvoiceSentMessage,
  bookingPaymentPartPaidMessage,
  paymentEscalationMessage,
} from './messages.js'
import { createBookingCalendarLinks } from '../lib/calendar-links.js'
import type { CalendarIntegrationService } from '../integrations/calendar/calendar-integration-service.js'
import type { Logger } from '../lib/logger.js'
import type { TelegramClient } from '../lib/telegram-client.js'
import type { TelegramMessage, TelegramPreCheckoutQuery } from '../lib/telegram-types.js'
import type {
  AvailableSlot,
  BookingLocation,
  BookingResource,
  BookingService,
} from '../services/booking-service.js'

type PaymentControllerOptions = {
  adminTelegramIds: number[]
  bookingService: BookingService
  calendarIntegration?: CalendarIntegrationService
  currency: string
  invoiceStorePath?: string
  logger: Logger
  providerToken: string
  telegram: TelegramClient
}

type BookingInvoicePayload = {
  amountMinorUnits: number
  locationId: string
  paidAmountMinorUnits: number
  partNumber: number
  resourceId: string
  slotId: string
  telegramUserId: number
  totalAmountMinorUnits: number
  totalParts: number
}

const maxInvoiceAmountMinorUnits = 9_900_000

export class PaymentController {
  private readonly invoiceStorePath: string
  private readonly pendingBookingInvoices = new Map<string, BookingInvoicePayload>()

  constructor(private readonly options: PaymentControllerOptions) {
    this.invoiceStorePath = options.invoiceStorePath ?? resolve(process.cwd(), 'data/invoice-store.json')
  }

  // загружает незавершённые инвойсы из файла при старте бота
  async initialize(): Promise<void> {
    try {
      const data = JSON.parse(await readFile(this.invoiceStorePath, 'utf8')) as Record<string, BookingInvoicePayload>
      for (const [key, value] of Object.entries(data)) {
        this.pendingBookingInvoices.set(key, value)
      }
    } catch {
      // файл отсутствует — начинаем с пустым хранилищем
    }
  }

  // создаёт инвойс и запускает процесс оплаты
  async confirmBooking(chatId: number, messageId: number, telegramUserId: number, data: string): Promise<void> {
    const parsed = parseResourceSlotData(data, 'confirm')
    const resource = await this.findResourceById(parsed.resourceId)
    const location = await this.findLocation(resource.locationId)
    const slot = await this.findSlot(parsed.resourceId, parsed.slotId)
    const paymentPlan = createPaymentPlan(resource.priceMinorUnits)
    const invoicePayload = createBookingInvoicePayload()
    const payload: BookingInvoicePayload = {
      amountMinorUnits: paymentPlan[0],
      locationId: resource.locationId,
      paidAmountMinorUnits: 0,
      partNumber: 1,
      resourceId: parsed.resourceId,
      slotId: parsed.slotId,
      telegramUserId,
      totalAmountMinorUnits: resource.priceMinorUnits,
      totalParts: paymentPlan.length,
    }
    this.pendingBookingInvoices.set(invoicePayload, payload)
    await this.savePendingInvoices()

    await this.sendBookingInvoice({
      chatId,
      invoicePayload,
      locationName: location.name,
      payload,
      resourceName: resource.name,
      slot,
    })

    await this.options.telegram.editMessageText(
      chatId,
      messageId,
      bookingInvoiceSentMessage({
        partAmount: formatMinorUnits(payload.amountMinorUnits),
        partNumber: payload.partNumber,
        totalAmount: formatMinorUnits(payload.totalAmountMinorUnits),
        totalParts: payload.totalParts,
      }),
      { reply_markup: mainMenuKeyboard() },
    )
  }

  // валидирует pre-checkout запрос перед списанием средств
  async handlePreCheckoutQuery(query: TelegramPreCheckoutQuery): Promise<void> {
    const payload = this.pendingBookingInvoices.get(query.invoice_payload)

    if (!payload || payload.telegramUserId !== query.from.id) {
      await this.options.telegram.answerPreCheckoutQuery(query.id, {
        ok: false,
        errorMessage: 'This payment invoice does not match your Telegram account.',
      })
      return
    }

    try {
      const resource = await this.findResource(payload.locationId, payload.resourceId)

      if (
        query.currency !== this.options.currency ||
        query.total_amount !== payload.amountMinorUnits ||
        payload.totalAmountMinorUnits !== resource.priceMinorUnits ||
        payload.amountMinorUnits > maxInvoiceAmountMinorUnits
      ) {
        await this.options.telegram.answerPreCheckoutQuery(query.id, {
          ok: false,
          errorMessage: 'The payment amount is no longer valid. Please start booking again.',
        })
        return
      }

      await this.findSlot(payload.resourceId, payload.slotId)
      await this.options.telegram.answerPreCheckoutQuery(query.id, { ok: true })
    } catch (error) {
      this.options.logger.error('Failed to validate pre-checkout booking payload', { error })
      await this.options.telegram.answerPreCheckoutQuery(query.id, {
        ok: false,
        errorMessage: 'This slot is no longer available. Please choose another one.',
      })
    }
  }

  // создаёт бронирование после успешной оплаты
  async handleSuccessfulPayment(message: TelegramMessage): Promise<void> {
    const invoicePayload = message.successful_payment?.invoice_payload
    const payload = invoicePayload ? this.pendingBookingInvoices.get(invoicePayload) : undefined

    if (!payload || payload.telegramUserId !== message.from?.id) {
      await this.options.telegram.sendMessage(
        message.chat.id,
        'Payment received, but I could not match it to this booking. Please contact support.',
        { reply_markup: mainMenuKeyboard() },
      )
      // уведомляем администраторов о несопоставленной оплате
      await this.notifyAdminsEscalation({
        invoicePayload: invoicePayload,
        telegramUserId: message.from?.id,
      })
      return
    }

    try {
      const paidAmountMinorUnits = payload.paidAmountMinorUnits + payload.amountMinorUnits
      if (paidAmountMinorUnits < payload.totalAmountMinorUnits) {
        await this.sendNextPaymentPart(message, invoicePayload!, payload, paidAmountMinorUnits)
        return
      }

      const booking = await this.options.bookingService.createBooking({
        resourceId: payload.resourceId,
        slotId: payload.slotId,
        telegramUserId: payload.telegramUserId,
      })
      const calendarEventIds = await this.options.calendarIntegration?.createEventsForBooking(booking)
      if (calendarEventIds && Object.keys(calendarEventIds).length > 0) {
        booking.calendarEventIds = calendarEventIds
        await this.options.bookingService.updateBookingCalendarEvents({
          bookingId: booking.id,
          calendarEventIds,
          telegramUserId: booking.telegramUserId,
        })
      }

      await this.options.telegram.sendMessage(message.chat.id, bookingCreatedMessage(booking), {
        reply_markup: bookingCalendarKeyboard(createBookingCalendarLinks(booking)),
      })
      if (invoicePayload) {
        this.pendingBookingInvoices.delete(invoicePayload)
        await this.savePendingInvoices()
      }
    } catch (error) {
      this.options.logger.error('Failed to create booking after successful payment', { error })
      await this.options.telegram.sendMessage(
        message.chat.id,
        'Payment received, but I could not create the booking automatically. Please contact support.',
        { reply_markup: mainMenuKeyboard() },
      )
    }
  }

  // отправляет следующий инвойс если заказ разбит на несколько платежей
  private async sendNextPaymentPart(
    message: TelegramMessage,
    invoicePayload: string,
    payload: BookingInvoicePayload,
    paidAmountMinorUnits: number,
  ): Promise<void> {
    const resource = await this.findResource(payload.locationId, payload.resourceId)
    const location = await this.findLocation(payload.locationId)
    const slot = await this.findSlot(payload.resourceId, payload.slotId)
    const nextAmountMinorUnits = Math.min(
      maxInvoiceAmountMinorUnits,
      payload.totalAmountMinorUnits - paidAmountMinorUnits,
    )
    const nextPayload = createBookingInvoicePayload()
    const nextPayment: BookingInvoicePayload = {
      ...payload,
      amountMinorUnits: nextAmountMinorUnits,
      paidAmountMinorUnits,
      partNumber: payload.partNumber + 1,
    }

    this.pendingBookingInvoices.delete(invoicePayload)
    this.pendingBookingInvoices.set(nextPayload, nextPayment)
    await this.savePendingInvoices()
    await this.sendBookingInvoice({
      chatId: message.chat.id,
      invoicePayload: nextPayload,
      locationName: location.name,
      payload: nextPayment,
      resourceName: resource.name,
      slot,
    })
    await this.options.telegram.sendMessage(
      message.chat.id,
      bookingPaymentPartPaidMessage({
        nextAmount: formatMinorUnits(nextPayment.amountMinorUnits),
        nextPartNumber: nextPayment.partNumber,
        paidAmount: formatMinorUnits(paidAmountMinorUnits),
        totalAmount: formatMinorUnits(nextPayment.totalAmountMinorUnits),
        totalParts: nextPayment.totalParts,
      }),
      { reply_markup: mainMenuKeyboard() },
    )
  }

  // отправляет telegram invoice для одной части оплаты
  private async sendBookingInvoice(input: {
    chatId: number
    invoicePayload: string
    locationName: string
    payload: BookingInvoicePayload
    resourceName: string
    slot: AvailableSlot
  }): Promise<void> {
    await this.options.telegram.sendInvoice({
      chatId: input.chatId,
      title: createInvoiceTitle(input.resourceName, input.payload),
      description: `${input.locationName}, ${input.slot.startsAt} - ${input.slot.endsAt}`,
      payload: input.invoicePayload,
      providerToken: this.options.providerToken,
      currency: this.options.currency,
      prices: [
        {
          label: createInvoiceLabel(input.resourceName, input.payload),
          amount: input.payload.amountMinorUnits,
        },
      ],
    })
  }

  // отправляет уведомление администраторам о несопоставленной оплате
  private async notifyAdminsEscalation(details: { invoicePayload?: string; telegramUserId?: number }): Promise<void> {
    const message = paymentEscalationMessage(details)
    for (const adminId of this.options.adminTelegramIds) {
      try {
        await this.options.telegram.sendMessage(adminId, message)
      } catch (error) {
        this.options.logger.error('Failed to notify admin about escalation', { error })
      }
    }
  }

  // сохраняет незавершённые инвойсы в файл
  private async savePendingInvoices(): Promise<void> {
    try {
      await mkdir(dirname(this.invoiceStorePath), { recursive: true })
      const data = Object.fromEntries(this.pendingBookingInvoices)
      await writeFile(this.invoiceStorePath, `${JSON.stringify(data, null, 2)}\n`)
    } catch (error) {
      this.options.logger.error('Failed to save pending invoices', { error })
    }
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

// парсит callback_data для подтверждения оплаты
function parseResourceSlotData(data: string, prefix: 'confirm'): { resourceId: string; slotId: string } {
  const [receivedPrefix, resourceId, slotId] = data.split(':')

  if (receivedPrefix !== prefix || !resourceId || !slotId) {
    throw new Error('Invalid callback payload.')
  }

  return { resourceId, slotId }
}

// генерирует уникальный идентификатор инвойса
function createBookingInvoicePayload(): string {
  return `booking-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// разбивает сумму на части не больше 99 000 рублей
function createPaymentPlan(totalAmountMinorUnits: number): number[] {
  const parts: number[] = []
  let remaining = totalAmountMinorUnits

  while (remaining > 0) {
    const amount = Math.min(maxInvoiceAmountMinorUnits, remaining)
    parts.push(amount)
    remaining -= amount
  }

  return parts.length > 0 ? parts : [0]
}

// формирует заголовок инвойса с номером части
function createInvoiceTitle(resourceName: string, payload: BookingInvoicePayload): string {
  if (payload.totalParts === 1) {
    return `Booking: ${resourceName}`
  }

  return `Booking: ${resourceName} (${payload.partNumber}/${payload.totalParts})`
}

// формирует подпись цены для инвойса
function createInvoiceLabel(resourceName: string, payload: BookingInvoicePayload): string {
  if (payload.totalParts === 1) {
    return `100% payment: ${resourceName}`
  }

  return `Payment ${payload.partNumber}/${payload.totalParts}: ${resourceName}`
}

// форматирует копейки в рубли для сообщений оплаты
function formatMinorUnits(amountMinorUnits: number): string {
  return `${(amountMinorUnits / 100).toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
    minimumFractionDigits: amountMinorUnits % 100 === 0 ? 0 : 2,
  })} ₽`
}
