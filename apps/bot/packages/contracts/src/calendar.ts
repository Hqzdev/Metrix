// Подключение внешнего календаря пользователя или ресурса.
export type CalendarConnection = {
  id: string
  provider: CalendarProvider
  scope: CalendarScope
  telegramUserId: number
  resourceId?: string
  calendarId: string
  accessToken?: string
  refreshToken: string
  expiresAt?: string
}

export type CalendarProvider = 'google' | 'microsoft'

export type CalendarScope = 'user' | 'resource'

// Payload запроса OAuth URL календаря.
export type CalendarAuthUrlInput = {
  provider: CalendarProvider
  telegramUserId: number
  scope: CalendarScope
  resourceId?: string
}

// Payload подключения календаря после OAuth.
export type ConnectCalendarInput = {
  code: string
  provider: CalendarProvider
  telegramUserId: number
  scope: CalendarScope
  resourceId?: string
}

// Payload отключения календаря.
export type DisconnectCalendarInput = {
  provider: CalendarProvider
  telegramUserId: number
}
