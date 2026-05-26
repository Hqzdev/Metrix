import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '@metrix/contracts'
import type { InlineKeyboardButton, InlineKeyboardMarkup } from './telegram-types.js'
import type { BotLanguage } from './messages.js'

/** Форматирует дату в строку YYYYMMDD без учёта timezone смещения. */
function toDateStr(d: Date): string {
  // Месяц в JS начинается с 0, поэтому добавляем 1.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** Возвращает короткое название дня недели + число. */
function dayLabel(d: Date, index: number, language: BotLanguage): string {
  // Первые два дня называем словами, дальше показываем день недели и дату.
  if (language === 'en') {
    if (index === 0) return 'Today'
    if (index === 1) return 'Tomorrow'
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
    return `${day} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  if (index === 0) return 'Сегодня'
  if (index === 1) return 'Завтра'
  const day = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()]
  return `${day} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
} 

/** Разбивает массив на строки по N элементов. */
function chunk<T>(arr: T[], size: number): T[][] {
  // Telegram inline_keyboard — это массив строк кнопок.
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function languageKeyboard(): InlineKeyboardMarkup {
  // Клавиатура первого запуска: пользователь выбирает язык.
  return {
    inline_keyboard: [
      [{ text: 'Continue in English', callback_data: 'language:en' }],
      [{ text: 'Перейти на русский', callback_data: 'language:ru' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function mainMenuKeyboard(language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Главное меню ведёт к основным сценариям бота.
  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Забронировать' : 'Book now', callback_data: 'menu:book' }],
      [{ text: language === 'ru' ? 'Доступные слоты' : 'Available slots', callback_data: 'menu:slots' }],
      [{ text: language === 'ru' ? 'Мои бронирования' : 'My bookings', callback_data: 'menu:bookings' }],
      [{ text: language === 'ru' ? 'Помощь' : 'Help', callback_data: 'menu:help' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function locationKeyboard(locations: BookingLocation[], language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Каждая локация становится отдельной кнопкой.
  return {
    inline_keyboard: [
      ...locations.map((l) => [{ text: `${l.name} · ${l.occupancy}`, callback_data: `location:${l.id}` }]),
      [{ text: language === 'ru' ? 'Назад в меню' : 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function resourceKeyboard(resources: BookingResource[], language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Каждая комната/ресурс становится отдельной кнопкой.
  return {
    inline_keyboard: [
      ...resources.map((r) => [{ text: `${r.name} · ${r.status}`, callback_data: `resource:${r.locationId}:${r.id}` }]),
      [{ text: language === 'ru' ? 'Назад к локациям' : 'Back to locations', callback_data: 'menu:book' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function slotsKeyboard(resource: BookingResource, slots: AvailableSlot[], language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Слот выбирается через callback slot:<resourceId>:<slotId>.
  return {
    inline_keyboard: [
      ...slots.map((s) => [{ text: `${s.startsAt} - ${s.endsAt}`, callback_data: `slot:${resource.id}:${s.id}` }]),
      [{ text: language === 'ru' ? 'Назад к офисам' : 'Back to offices', callback_data: `location:${resource.locationId}` }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function confirmBookingKeyboard(resource: BookingResource, slotId: string, language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // confirm отправляет пользователя к оплате.
  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Оплатить и забронировать' : 'Pay 100% and book', callback_data: `confirm:${resource.id}:${slotId}` }],
      [{ text: language === 'ru' ? 'Выбрать другой слот' : 'Choose another slot', callback_data: `resource:${resource.locationId}:${resource.id}` }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 *
 * Для каждого бронирования показывает две кнопки в одной строке:
 * [🔄 Перенести: <name>] [❌ Отменить: <name>]
 */
export function bookingsKeyboard(bookings: Booking[], language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Для каждой брони даём два действия: перенести или отменить.
  return {
    inline_keyboard: [
      ...bookings.map((b) => [
        { text: `🔄 ${language === 'ru' ? 'Перенести' : 'Reschedule'}: ${b.resourceName}`, callback_data: `reschedule:${b.id}` },
        { text: `❌ ${language === 'ru' ? 'Отменить' : 'Cancel'}: ${b.resourceName}`, callback_data: `cancel:${b.id}` },
      ]),
      [{ text: language === 'ru' ? 'Назад в меню' : 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function confirmCancelKeyboard(bookingId: string, language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Отмена требует второго подтверждения.
  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Отменить бронирование' : 'Cancel booking', callback_data: `cancel_confirm:${bookingId}` }],
      [{ text: language === 'ru' ? 'Оставить бронирование' : 'Keep booking', callback_data: 'menu:bookings' }],
    ],
  }
}

/**
 * Клавиатура выбора даты — 7 дней начиная с сегодня, по 3 кнопки в строке.
 */
export function datePickerKeyboard(locationId: string, resourceId: string, language: BotLanguage = 'ru'): InlineKeyboardMarkup {
  // Показываем ближайшие 7 дней.
  const today = new Date()
  const buttons: InlineKeyboardButton[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return { text: dayLabel(d, i, language), callback_data: `date:${toDateStr(d)}` }
  })
  return {
    inline_keyboard: [
      ...chunk(buttons, 3),
      [{ text: language === 'ru' ? '← Назад' : '← Back', callback_data: `resource:${locationId}:${resourceId}` }],
    ],
  }
}

/**
 * Клавиатура выбора часа начала — рабочие часы 08–20, по 4 кнопки в строке.
 */
export function timePickerKeyboard(locationId: string, resourceId: string, dateStr: string, language: BotLanguage = 'ru'): InlineKeyboardMarkup {
  // Рабочие часы для выбора начала брони.
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  const buttons: InlineKeyboardButton[] = hours.map((h) => ({
    text: `${String(h).padStart(2, '0')}:00`,
    callback_data: `time:${h}`,
  }))
  return {
    inline_keyboard: [
      ...chunk(buttons, 4),
      [{ text: language === 'ru' ? '← Назад' : '← Back', callback_data: `date:${dateStr}` }],
    ],
  }
}

/**
 * Клавиатура выбора продолжительности — 1, 2, 3, 4 часа в одной строке.
 */
export function durationPickerKeyboard(hour: number, language: BotLanguage = 'ru'): InlineKeyboardMarkup {
  // Длительность хранится в callback dur:<hours>.
  return {
    inline_keyboard: [
      [1, 2, 3, 4].map((h) => ({ text: language === 'ru' ? `${h}ч` : `${h}h`, callback_data: `dur:${h}` })),
      [{ text: language === 'ru' ? '← Назад' : '← Back', callback_data: `time:${hour}` }],
    ],
  }
}

/**
 * Клавиатура подтверждения брони с произвольным временем (параметры в сессии).
 */
export function confirmCustomBookingKeyboard(locationId: string, resourceId: string, language: BotLanguage = 'ru'): InlineKeyboardMarkup {
  // Параметры кастомной брони лежат в Redis session, поэтому callback короткий.
  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Оплатить и забронировать' : 'Pay and book', callback_data: 'confirm_custom' }],
      [{ text: language === 'ru' ? 'Выбрать другое время' : 'Choose another time', callback_data: `resource:${locationId}:${resourceId}` }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function calendarAuthKeyboard(googleUrl: string, language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // URL-кнопка открывает Google OAuth consent.
  return {
    inline_keyboard: [
      [{ text: language === 'ru' ? 'Подключить Google Calendar' : 'Connect Google Calendar', url: googleUrl }],
      [{ text: language === 'ru' ? 'Назад в меню' : 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

/**
 * Формирует inline-клавиатуру Telegram для текущего сценария.
 */
export function calendarStatusKeyboard(input: { connectedProviders: string[]; googleUrl?: string }, language: BotLanguage = 'en'): InlineKeyboardMarkup {
  // Строки собираются динамически по подключённым провайдерам.
  const rows: InlineKeyboardMarkup['inline_keyboard'] = []
  if (input.googleUrl && !input.connectedProviders.includes('google')) {
    rows.push([{ text: language === 'ru' ? 'Подключить Google Calendar' : 'Connect Google Calendar', url: input.googleUrl }])
  }
  if (input.connectedProviders.includes('google')) {
    rows.push([{ text: language === 'ru' ? 'Отключить Google Calendar' : 'Disconnect Google Calendar', callback_data: 'calendar:disconnect:google' }])
  }
  if (input.connectedProviders.includes('microsoft')) {
    rows.push([{ text: language === 'ru' ? 'Отключить Outlook Calendar' : 'Disconnect Outlook Calendar', callback_data: 'calendar:disconnect:microsoft' }])
  }
  rows.push([{ text: language === 'ru' ? 'Назад в меню' : 'Back to menu', callback_data: 'menu:start' }])
  return { inline_keyboard: rows }
}
