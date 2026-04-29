import type {
  CalendarAdapter,
  CalendarBusyInterval,
  CalendarProviderConfig,
  CalendarTokenResponse,
} from './types.js'
import type { Booking } from '../../services/booking-service.js'
import { withRetry } from './retry.js'

export class MicrosoftCalendarAdapter implements CalendarAdapter {
  constructor(private readonly config: CalendarProviderConfig) {}

  // создаёт ссылку авторизации microsoft oauth
  createAuthorizationUrl(input: { state: string }): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      prompt: 'consent',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      response_type: 'code',
      scope: 'offline_access Calendars.ReadWrite',
      state: input.state,
    })

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  }

  // меняет oauth code на токены
  async exchangeCode(code: string): Promise<CalendarTokenResponse> {
    return this.requestToken({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    })
  }

  // обновляет accessToken через refreshToken
  async refreshAccessToken(refreshToken: string): Promise<CalendarTokenResponse> {
    return this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  }

  // создаёт событие в microsoft calendar
  async createEvent(input: { accessToken: string; booking: Booking; calendarId: string }): Promise<string> {
    const endpoint = input.calendarId === 'primary' ? 'me/events' : `me/calendars/${input.calendarId}/events`
    const response = await withRetry(() =>
      fetch(`https://graph.microsoft.com/v1.0/${endpoint}`, {
        body: JSON.stringify({
          body: {
            content: `Smart Booking reservation for ${input.booking.resourceName}.`,
            contentType: 'text',
          },
          end: { dateTime: input.booking.endsAtIso, timeZone: 'UTC' },
          location: { displayName: input.booking.locationName },
          start: { dateTime: input.booking.startsAtIso, timeZone: 'UTC' },
          subject: `Booking: ${input.booking.resourceName}`,
        }),
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )
    const data = (await readJson(response)) as { id?: string }

    if (!response.ok || !data.id) {
      throw new Error(`Microsoft Calendar event creation failed: ${response.status}`)
    }

    return data.id
  }

  // удаляет событие из microsoft calendar
  async deleteEvent(input: { accessToken: string; calendarId: string; eventId: string }): Promise<void> {
    const response = await withRetry(() =>
      fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(input.eventId)}`, {
        headers: { authorization: `Bearer ${input.accessToken}` },
        method: 'DELETE',
      }),
    )

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`Microsoft Calendar event deletion failed: ${response.status}`)
    }
  }

  // получает занятые интервалы через microsoft graph
  async listBusyIntervals(input: {
    accessToken: string
    calendarId: string
    endsAtIso: string
    startsAtIso: string
  }): Promise<CalendarBusyInterval[]> {
    const response = await withRetry(() =>
      fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
        body: JSON.stringify({
          availabilityViewInterval: 60,
          endTime: { dateTime: input.endsAtIso, timeZone: 'UTC' },
          schedules: [input.calendarId === 'primary' ? 'me' : input.calendarId],
          startTime: { dateTime: input.startsAtIso, timeZone: 'UTC' },
        }),
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )
    const data = (await readJson(response)) as {
      value?: Array<{ scheduleItems?: Array<{ end: { dateTime: string }; start: { dateTime: string } }> }>
    }

    if (!response.ok) {
      throw new Error(`Microsoft Calendar getSchedule failed: ${response.status}`)
    }

    return (data.value?.[0]?.scheduleItems ?? []).map((item) => ({
      endsAtIso: item.end.dateTime,
      startsAtIso: item.start.dateTime,
    }))
  }

  // выполняет запрос к oauth token endpoint
  private async requestToken(payload: Record<string, string>): Promise<CalendarTokenResponse> {
    const response = await withRetry(() =>
      fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          ...payload,
        }),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }),
    )
    const data = (await readJson(response)) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
    }

    if (!response.ok || !data.access_token) {
      throw new Error(`Microsoft OAuth token request failed: ${response.status}`)
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
    }
  }
}

// безопасно читает json из ответа
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  return text ? JSON.parse(text) : {}
}
