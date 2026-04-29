import type { CalendarEnv } from '../../lib/env.js'
import type { Logger } from '../../lib/logger.js'
import type { Booking, BookingService } from '../../services/booking-service.js'
import { createSlots } from '../../services/booking-slots.js'
import { CalendarConnectionStore } from './calendar-connection-store.js'
import { GoogleCalendarAdapter } from './google-calendar-adapter.js'
import { MicrosoftCalendarAdapter } from './microsoft-calendar-adapter.js'
import type {
  CalendarAdapter,
  CalendarBusyInterval,
  CalendarConnection,
  CalendarConnectionScope,
  CalendarProvider,
} from './types.js'

type CalendarIntegrationServiceOptions = {
  bookingService: BookingService
  env: CalendarEnv
  logger: Logger
  store?: CalendarConnectionStore
}

type ConnectInput = {
  code: string
  provider: CalendarProvider
  resourceId?: string
  scope: CalendarConnectionScope
  telegramUserId: number
}

export class CalendarIntegrationService {
  private readonly adapters = new Map<CalendarProvider, CalendarAdapter>()
  private readonly store: CalendarConnectionStore

  constructor(private readonly options: CalendarIntegrationServiceOptions) {
    this.store =
      options.store ??
      new CalendarConnectionStore({
        encryptionSecret: options.env.encryptionSecret,
      })

    if (options.env.google) {
      this.adapters.set('google', new GoogleCalendarAdapter(options.env.google))
    }

    if (options.env.microsoft) {
      this.adapters.set('microsoft', new MicrosoftCalendarAdapter(options.env.microsoft))
    }
  }

  // создаёт oauth-ссылку для подключения календаря
  createAuthorizationUrl(input: {
    provider: CalendarProvider
    resourceId?: string
    scope: CalendarConnectionScope
    telegramUserId: number
  }): string {
    const adapter = this.getAdapter(input.provider)
    const state = Buffer.from(
      JSON.stringify({
        resourceId: input.resourceId,
        scope: input.scope,
        telegramUserId: input.telegramUserId,
      }),
    ).toString('base64url')

    return adapter.createAuthorizationUrl({ state })
  }

  // подключает календарь после получения oauth code
  async connect(input: ConnectInput): Promise<CalendarConnection> {
    const adapter = this.getAdapter(input.provider)
    const token = await adapter.exchangeCode(input.code)
    const connection: CalendarConnection = {
      accessToken: token.accessToken,
      calendarId: 'primary',
      expiresAt: token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : undefined,
      provider: input.provider,
      refreshToken: token.refreshToken ?? token.accessToken,
      resourceId: input.scope === 'resource' ? input.resourceId : undefined,
      scope: input.scope,
      telegramUserId: input.telegramUserId,
    }

    await this.store.saveConnection(connection)
    return connection
  }

  // создаёт события календаря для новой брони
  async createEventsForBooking(booking: Booking): Promise<Partial<Record<CalendarProvider, string>>> {
    const eventIds: Partial<Record<CalendarProvider, string>> = {}
    const connections = await this.store.listConnectionsForBooking({
      resourceId: booking.resourceId,
      telegramUserId: booking.telegramUserId,
    })

    for (const connection of connections) {
      try {
        const accessToken = await this.getAccessToken(connection)
        const adapter = this.getAdapter(connection.provider)
        eventIds[connection.provider] = await adapter.createEvent({
          accessToken,
          booking,
          calendarId: connection.calendarId,
        })
      } catch (error) {
        this.options.logger.error('Failed to create calendar event', {
          bookingId: booking.id,
          error,
          provider: connection.provider,
        })
      }
    }

    return eventIds
  }

  // удаляет события календаря при отмене брони
  async deleteEventsForBooking(booking: Booking): Promise<void> {
    if (!booking.calendarEventIds) {
      return
    }

    const connections = await this.store.listConnectionsForBooking({
      resourceId: booking.resourceId,
      telegramUserId: booking.telegramUserId,
    })

    for (const connection of connections) {
      const eventId = booking.calendarEventIds[connection.provider]
      if (!eventId) {
        continue
      }

      try {
        const accessToken = await this.getAccessToken(connection)
        await this.getAdapter(connection.provider).deleteEvent({
          accessToken,
          calendarId: connection.calendarId,
          eventId,
        })
      } catch (error) {
        this.options.logger.error('Failed to delete calendar event', {
          bookingId: booking.id,
          error,
          provider: connection.provider,
        })
      }
    }
  }

  // синхронизирует занятые интервалы календаря со слотами ресурса
  async syncBusySlotsForResource(resourceId: string): Promise<void> {
    const connections = await this.store.listResourceConnections(resourceId)
    const slots = createSlots(resourceId)
    const busyIntervals: CalendarBusyInterval[] = []

    for (const connection of connections) {
      try {
        const accessToken = await this.getAccessToken(connection)
        const adapter = this.getAdapter(connection.provider)
        busyIntervals.push(
          ...(await adapter.listBusyIntervals({
            accessToken,
            calendarId: connection.calendarId,
            endsAtIso: slots.at(-1)?.endsAtIso ?? new Date().toISOString(),
            startsAtIso: slots[0]?.startsAtIso ?? new Date().toISOString(),
          })),
        )
      } catch (error) {
        this.options.logger.error('Failed to sync calendar busy intervals', { error, resourceId })
      }
    }

    const busySlotIds = slots
      .filter((slot) =>
        busyIntervals.some(
          (busy) => new Date(busy.startsAtIso) < new Date(slot.endsAtIso) && new Date(busy.endsAtIso) > new Date(slot.startsAtIso),
        ),
      )
      .map((slot) => slot.id)

    await this.options.bookingService.blockBusySlots({ resourceId, slotIds: busySlotIds })
  }

  // возвращает рабочий accessToken и обновляет его если он устарел
  private async getAccessToken(connection: CalendarConnection): Promise<string> {
    if (connection.accessToken && connection.expiresAt && new Date(connection.expiresAt).getTime() > Date.now() + 60_000) {
      return connection.accessToken
    }

    const adapter = this.getAdapter(connection.provider)
    const token = await adapter.refreshAccessToken(connection.refreshToken)
    connection.accessToken = token.accessToken
    connection.expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : undefined
    if (token.refreshToken) {
      connection.refreshToken = token.refreshToken
    }
    await this.store.updateConnection(connection)

    return token.accessToken
  }

  // достаёт адаптер провайдера или падает если он не настроен
  private getAdapter(provider: CalendarProvider): CalendarAdapter {
    const adapter = this.adapters.get(provider)

    if (!adapter) {
      throw new Error(`Calendar provider is not configured: ${provider}`)
    }

    return adapter
  }
}
