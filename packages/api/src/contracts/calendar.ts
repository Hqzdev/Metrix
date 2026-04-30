export type CalendarProvider = 'google' | 'microsoft'

export type CalendarConnectionScope = 'resource' | 'user'

export type CalendarConnectionResponse = {
  id: string
  calendarId: string
  expiresAt?: string
  provider: CalendarProvider
  resourceId?: string
  scope: CalendarConnectionScope
  telegramUserId?: number
  userId?: string
}

export type ConnectCalendarRequest = {
  code: string
  provider: CalendarProvider
  resourceId?: string
  scope: CalendarConnectionScope
  telegramUserId?: number
  userId?: string
}
