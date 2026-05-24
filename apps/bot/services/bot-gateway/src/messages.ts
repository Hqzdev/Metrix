import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '@metrix/contracts'

// Поддерживаемые языки Telegram UI.
export type BotLanguage = 'en' | 'ru'

// Все короткие тексты держим в одном объекте, чтобы не размазывать локализацию.
const copy = {
  en: {
    availableSlotsFor: (resourceName: string) => `Available slots for ${resourceName}:`,
    bookingConfirmed: 'Booking confirmed.',
    calendar: 'Calendar',
    calendarConnected: 'connected',
    calendarConnection: 'Calendar connection',
    calendarDisconnectHint: 'You can disconnect a calendar below.',
    calendarGoogleInstructions: 'Press the button below and choose your Google account.',
    calendarGoogleReady: 'After approval I will connect the calendar automatically.',
    calendarNotConfigured: 'Google Calendar is not configured.',
    chooseAction: 'Choose an action below.',
    chooseLocation: 'Choose a location:',
    chooseWorkspace: 'Choose an office or workspace:',
    dueNow: 'Due now',
    helpTitle: 'What I can do:',
    locationEmpty: 'No offices available at this location.',
    noActiveBookings: 'You have no active bookings.',
    noSlots: (resourceName: string) => `${resourceName} has no available slots right now.`,
    office: 'Office',
    paid: 'Paid',
    seats: 'Seats',
    rescheduleIntro: (resourceName: string, startsAt: string) =>
      `You are rescheduling *${resourceName}* (${startsAt}).\n\nChoose a new time — your old booking will be cancelled after successful payment.`,
    selectBookingToManage: 'Choose a booking to manage it.',
    smartBookingIntro: 'Smart Booking helps you reserve rooms and desks in a few taps.',
    time: 'Time',
    welcome: 'Welcome',
    yourActiveBookings: 'Your active bookings:',
  },
  ru: {
    availableSlotsFor: (resourceName: string) => `Доступные слоты для ${resourceName}:`,
    bookingConfirmed: 'Бронирование подтверждено.',
    calendar: 'Календарь',
    calendarConnected: 'подключён',
    calendarConnection: 'Подключение календаря',
    calendarDisconnectHint: 'Ниже можно отключить календарь.',
    calendarGoogleInstructions: 'Нажмите кнопку ниже и выберите Google-аккаунт.',
    calendarGoogleReady: 'После подтверждения я подключу календарь автоматически.',
    calendarNotConfigured: 'Google Calendar не настроен.',
    chooseAction: 'Выберите действие ниже.',
    chooseLocation: 'Выберите локацию:',
    chooseWorkspace: 'Выберите офис или рабочее место:',
    dueNow: 'К оплате',
    helpTitle: 'Что я умею:',
    locationEmpty: 'В этой локации нет доступных офисов.',
    noActiveBookings: 'У вас нет активных бронирований.',
    noSlots: (resourceName: string) => `Сейчас у ${resourceName} нет доступных слотов.`,
    office: 'Офис',
    paid: 'Оплачено',
    seats: 'Мест',
    rescheduleIntro: (resourceName: string, startsAt: string) =>
      `Вы переносите бронирование *${resourceName}* (${startsAt}).\n\nВыберите новое время — старое бронирование будет отменено после успешной оплаты.`,
    selectBookingToManage: 'Выберите бронирование для управления.',
    smartBookingIntro: 'Smart Booking помогает забронировать комнаты и рабочие места в пару нажатий.',
    time: 'Время',
    welcome: 'Добро пожаловать',
    yourActiveBookings: 'Ваши активные бронирования:',
  },
} as const

/**
 * Формирует первое сообщение выбора языка.
 */
export function languagePromptMessage(): string {
  return 'Which language would you like to use?'
}

/**
 * Формирует сообщение-пояснение при начале переноса бронирования.
 */
export function rescheduleIntroMessage(resourceName: string, startsAt: string, language: BotLanguage = 'en'): string {
  return copy[language].rescheduleIntro(resourceName, startsAt)
}

/**
 * Формирует приветственное сообщение для Telegram-пользователя.
 */
export function welcomeMessage(firstName?: string, language: BotLanguage = 'en'): string {
  const t = copy[language]
  const name = firstName ? `, ${firstName}` : ''
  return [`${t.welcome}${name}.`, '', t.smartBookingIntro, t.chooseAction].join('\n')
}

/**
 * Формирует справочное сообщение со списком команд.
 */
export function helpMessage(language: BotLanguage = 'en'): string {
  const t = copy[language]
  return [
    t.helpTitle,
    '',
    language === 'ru' ? '/book - выбрать комнату или стол' : '/book - choose a room or desk',
    language === 'ru' ? '/slots - посмотреть доступные слоты' : '/slots - browse availability',
    language === 'ru' ? '/my_bookings - посмотреть и отменить бронирования' : '/my_bookings - view and cancel bookings',
    language === 'ru' ? '/calendar - подключить Google Calendar' : '/calendar - connect Google Calendar',
    language === 'ru' ? '/help - показать это сообщение' : '/help - show this message',
  ].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function locationsMessage(locations: BookingLocation[], language: BotLanguage = 'en'): string {
  // Каждую локацию показываем строкой с адресом и occupancy.
  const list = locations.map((l) => `• ${l.name}, ${l.address} (${l.occupancy})`).join('\n')
  return [copy[language].chooseLocation, '', list].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function resourcesMessage(resources: BookingResource[], language: BotLanguage = 'en'): string {
  // Если ресурсов нет, возвращаем короткое пустое состояние.
  if (resources.length === 0) return copy[language].locationEmpty
  const list = resources.map((r) => `• ${r.name} (${r.seats}, ${r.priceLabel}, ${r.occupancy}, ${r.status})`).join('\n')
  return [copy[language].chooseWorkspace, '', list].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function slotsMessage(resource: BookingResource, slots: AvailableSlot[], language: BotLanguage = 'en'): string {
  const t = copy[language]
  // Список слотов показывается кнопками, поэтому текст короткий.
  if (slots.length === 0) return t.noSlots(resource.name)
  return t.availableSlotsFor(resource.name)
}

/**
 * Выполняет bookingConfirmationPrompt как отдельный шаг сервисной логики.
 */
export function bookingConfirmationPrompt(resource: BookingResource, slot: AvailableSlot, language: BotLanguage = 'en'): string {
  // Перед оплатой показываем пользователю место, время и цену.
  const t = copy[language]
  const title = language === 'ru' ? 'Подтвердите бронирование:' : 'Please confirm your booking:'
  return [title, '', `${t.office}: ${resource.name}`, `${t.seats}: ${resource.seats}`, `${t.time}: ${slot.startsAt} - ${slot.endsAt}`, `${t.dueNow}: ${resource.priceLabel}`].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function bookingsMessage(bookings: Booking[], language: BotLanguage = 'en'): string {
  // Если активных броней нет, кнопки управления не нужны.
  if (bookings.length === 0) return copy[language].noActiveBookings
  const list = bookings.map((b) => `• ${b.locationName}, ${b.resourceName}: ${b.startsAt} – ${b.endsAt}`).join('\n')
  return [copy[language].yourActiveBookings, '', list, '', copy[language].selectBookingToManage].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function bookingCreatedMessage(booking: Booking, language: BotLanguage = 'en'): string {
  // Подтверждение после создания booking.
  const t = copy[language]
  return [t.bookingConfirmed, '', booking.locationName, booking.resourceName, `${booking.startsAt} - ${booking.endsAt}`, `${t.paid}: ${booking.priceLabel}`].join('\n')
}

/**
 * Форматирует YYYYMMDD в читаемую строку вида "23 мая 2026".
 */
function formatDateStr(dateStr: string, language: BotLanguage = 'ru'): string {
  // dateStr приходит в формате YYYYMMDD.
  const year = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(4, 6), 10) - 1
  const day = parseInt(dateStr.slice(6, 8), 10)
  return new Date(year, month, day).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Сообщение при выборе даты.
 */
export function selectDateMessage(resource: BookingResource, language: BotLanguage = 'ru'): string {
  return language === 'ru'
    ? [`Бронирование: ${resource.name}`, '', 'Выберите дату:'].join('\n')
    : [`Booking: ${resource.name}`, '', 'Choose a date:'].join('\n')
}

/**
 * Сообщение при выборе часа начала.
 */
export function selectTimeMessage(resource: BookingResource, dateStr: string, language: BotLanguage = 'ru'): string {
  return language === 'ru'
    ? [`Бронирование: ${resource.name}`, `Дата: ${formatDateStr(dateStr, language)}`, '', 'Выберите время начала:'].join('\n')
    : [`Booking: ${resource.name}`, `Date: ${formatDateStr(dateStr, language)}`, '', 'Choose a start time:'].join('\n')
}

/**
 * Сообщение при выборе продолжительности.
 */
export function selectDurationMessage(resource: BookingResource, dateStr: string, hour: number, language: BotLanguage = 'ru'): string {
  // Час показываем в формате HH:00.
  const timeLabel = `${String(hour).padStart(2, '0')}:00`
  return language === 'ru'
    ? [`Бронирование: ${resource.name}`, `Дата: ${formatDateStr(dateStr, language)}`, `Начало: ${timeLabel}`, '', 'Выберите продолжительность:'].join('\n')
    : [`Booking: ${resource.name}`, `Date: ${formatDateStr(dateStr, language)}`, `Start: ${timeLabel}`, '', 'Choose duration:'].join('\n')
}

/**
 * Сообщение подтверждения брони с произвольным временем.
 */
export function customBookingConfirmationPrompt(resource: BookingResource, dateStr: string, hour: number, duration: number, language: BotLanguage = 'ru'): string {
  // Конец слота считаем как start hour + duration.
  const start = `${String(hour).padStart(2, '0')}:00`
  const end = `${String(hour + duration).padStart(2, '0')}:00`
  return language === 'ru'
    ? ['Подтвердите бронирование:', '', `Место: ${resource.name}`, `Мест: ${resource.seats}`, `Дата: ${formatDateStr(dateStr, language)}`, `Время: ${start} – ${end}`, `Итого: ${resource.priceLabel}`].join('\n')
    : ['Please confirm your booking:', '', `Place: ${resource.name}`, `Seats: ${resource.seats}`, `Date: ${formatDateStr(dateStr, language)}`, `Time: ${start} - ${end}`, `Total: ${resource.priceLabel}`].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function calendarAuthMessage(input: { googleUrl?: string }, language: BotLanguage = 'en'): string {
  const t = copy[language]
  if (!input.googleUrl) return t.calendarNotConfigured
  return [t.calendarConnection, '', t.calendarGoogleInstructions, t.calendarGoogleReady].join('\n')
}

/**
 * Формирует текст сообщения для Telegram-интерфейса.
 */
export function calendarStatusMessage(connectedProviders: string[], language: BotLanguage = 'en'): string {
  const t = copy[language]
  const lines = [t.calendar, '']
  for (const p of connectedProviders) {
    lines.push(`${p === 'google' ? 'Google Calendar' : 'Outlook Calendar'}: ${t.calendarConnected}`)
  }
  lines.push('', t.calendarDisconnectHint)
  return lines.join('\n')
}
