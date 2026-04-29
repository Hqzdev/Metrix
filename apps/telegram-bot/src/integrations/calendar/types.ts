import type { Booking } from '../../services/booking-service.js'

export type CalendarProvider = 'google' | 'microsoft'

export type CalendarProviderConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type CalendarConnectionScope = 'resource' | 'user'

export type CalendarConnection = {
  accessToken?: string
  calendarId: string
  expiresAt?: string
  provider: CalendarProvider
  refreshToken: string
  resourceId?: string
  scope: CalendarConnectionScope
  telegramUserId: number
}

export type CalendarTokenResponse = {
  accessToken: string
  expiresIn?: number
  refreshToken?: string
}

export type CalendarBusyInterval = {
  endsAtIso: string
  startsAtIso: string
}

export type CalendarAdapter = {
  createAuthorizationUrl(input: { state: string }): string
  createEvent(input: { accessToken: string; booking: Booking; calendarId: string }): Promise<string>
  deleteEvent(input: { accessToken: string; calendarId: string; eventId: string }): Promise<void>
  exchangeCode(code: string): Promise<CalendarTokenResponse>
  listBusyIntervals(input: {
    accessToken: string
    calendarId: string
    endsAtIso: string
    startsAtIso: string
  }): Promise<CalendarBusyInterval[]>
  refreshAccessToken(refreshToken: string): Promise<CalendarTokenResponse>
}
