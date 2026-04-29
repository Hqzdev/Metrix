import type {
  CalendarAdapter,
  CalendarBusyInterval,
  CalendarProviderConfig,
  CalendarTokenResponse,
} from './types.js'
import type { Booking } from '../../services/booking-service.js'
import { withRetry } from './retry.js'

export class GoogleCalendarAdapter implements CalendarAdapter {
  constructor(private readonly config: CalendarProviderConfig) {}

  // создаёт ссылку авторизации google oauth
  createAuthorizationUrl(input: { state: string }): string {
    const params = new URLSearchParams({
      access_type: 'offline',
      client_id: this.config.clientId,
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
      state: input.state,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
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

  // создаёт событие в google calendar
  async createEvent(input: { accessToken: string; booking: Booking; calendarId: string }): Promise<string> {
    const body = {
      description: `Smart Booking reservation for ${input.booking.resourceName}.`,
      end: { dateTime: input.booking.endsAtIso },
      location: input.booking.locationName,
      start: { dateTime: input.booking.startsAtIso },
      summary: `Booking: ${input.booking.resourceName}`,
    }

    const response = await withRetry(() =>
      fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`, {
        body: JSON.stringify(body),
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )
    const data = (await readJson(response)) as { id?: string }

    if (!response.ok || !data.id) {
      throw new Error(`Google Calendar event creation failed: ${response.status}`)
    }

    return data.id
  }

  // удаляет событие из google calendar
  async deleteEvent(input: { accessToken: string; calendarId: string; eventId: string }): Promise<void> {
    const response = await withRetry(() =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
        {
          headers: { authorization: `Bearer ${input.accessToken}` },
          method: 'DELETE',
        },
      ),
    )

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`Google Calendar event deletion failed: ${response.status}`)
    }
  }

  // получает занятые интервалы через google freebusy
  async listBusyIntervals(input: {
    accessToken: string
    calendarId: string
    endsAtIso: string
    startsAtIso: string
  }): Promise<CalendarBusyInterval[]> {
    const response = await withRetry(() =>
      fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        body: JSON.stringify({
          items: [{ id: input.calendarId }],
          timeMax: input.endsAtIso,
          timeMin: input.startsAtIso,
        }),
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )
    const data = (await readJson(response)) as {
      calendars?: Record<string, { busy?: Array<{ end: string; start: string }> }>
    }

    if (!response.ok) {
      throw new Error(`Google Calendar freebusy failed: ${response.status}`)
    }

    return (data.calendars?.[input.calendarId]?.busy ?? []).map((busy) => ({
      endsAtIso: busy.end,
      startsAtIso: busy.start,
    }))
  }

  // выполняет запрос к oauth token endpoint
  private async requestToken(payload: Record<string, string>): Promise<CalendarTokenResponse> {
    const response = await withRetry(() =>
      fetch('https://oauth2.googleapis.com/token', {
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
      throw new Error(`Google OAuth token request failed: ${response.status}`)
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
