// Telegram ограничивает callback_data 64 байтами.
const MAX_CALLBACK_DATA_BYTES = 64
// Разрешаем только безопасные символы в id, чтобы callback нельзя было использовать как произвольную строку.
const SAFE_TOKEN = /^[A-Za-z0-9._-]+$/

// Действия главного меню.
type MenuAction = 'start' | 'help' | 'book' | 'slots' | 'bookings' | 'stats'

// Все типы callback_data, которые понимает bot-gateway.
export type ParsedCallbackData =
  | { type: 'language'; language: 'en' | 'ru' }
  | { type: 'menu'; action: MenuAction }
  | { type: 'location'; locationId: string }
  | { type: 'resource'; locationId: string; resourceId: string }
  | { type: 'slot'; resourceId: string; slotId: string }
  | { type: 'confirm'; resourceId: string; slotId: string }
  | { type: 'confirm_custom' }
  | { type: 'date'; date: string }
  | { type: 'time'; hour: number } 
  | { type: 'dur'; hours: number }
  | { type: 'cancel'; bookingId: string }
  | { type: 'cancel_confirm'; bookingId: string }
  | { type: 'reschedule'; bookingId: string }
  | { type: 'calendar_disconnect'; provider: 'google' | 'microsoft' }

/**
 * Парсит Telegram callback_data в безопасную доменную команду.
 *
 * Telegram ограничивает callback_data 64 bytes.
 * Даже если кнопки генерирует наш UI, вход всё равно валидируется:
 * пользователь может прислать callback вручную или из старого сообщения.
 */
export function parseCallbackData(data: string): ParsedCallbackData | null {
  // Слишком длинный callback сразу отклоняем.
  if (Buffer.byteLength(data, 'utf8') > MAX_CALLBACK_DATA_BYTES) return null

  // Формат большинства callback: prefix:arg1:arg2.
  const parts = data.split(':')
  const [prefix] = parts

  if (prefix === 'language' && parts.length === 2 && (parts[1] === 'en' || parts[1] === 'ru')) {
    // language:en или language:ru.
    return { type: 'language', language: parts[1] }
  }

  if (prefix === 'menu' && parts.length === 2 && isMenuAction(parts[1])) {
    // menu:start, menu:book и т.д.
    return { type: 'menu', action: parts[1] }
  }

  if (prefix === 'location' && parts.length === 2 && isSafeToken(parts[1])) {
    // location:<locationId>.
    return { type: 'location', locationId: parts[1] }
  }

  if (prefix === 'resource' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    // resource:<locationId>:<resourceId>.
    return { type: 'resource', locationId: parts[1], resourceId: parts[2] }
  }

  if (prefix === 'slot' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    // slot:<resourceId>:<slotId>.
    return { type: 'slot', resourceId: parts[1], slotId: parts[2] }
  }

  if (prefix === 'confirm' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    // confirm:<resourceId>:<slotId>.
    return { type: 'confirm', resourceId: parts[1], slotId: parts[2] }
  }

  if (prefix === 'cancel' && parts.length === 2 && isSafeToken(parts[1])) {
    // cancel:<bookingId>.
    return { type: 'cancel', bookingId: parts[1] }
  }

  if (prefix === 'cancel_confirm' && parts.length === 2 && isSafeToken(parts[1])) {
    // cancel_confirm:<bookingId>.
    return { type: 'cancel_confirm', bookingId: parts[1] }
  }

  if (prefix === 'reschedule' && parts.length === 2 && isSafeToken(parts[1])) {
    // reschedule:<bookingId>.
    return { type: 'reschedule', bookingId: parts[1] }
  }

  if (prefix === 'calendar' && parts.length === 3 && parts[1] === 'disconnect') {
    // calendar:disconnect:google.
    const provider = parts[2]
    if (provider === 'google' || provider === 'microsoft') {
      return { type: 'calendar_disconnect', provider }
    }
  }

  // date:YYYYMMDD — выбор даты при произвольном бронировании
  if (prefix === 'date' && parts.length === 2 && /^\d{8}$/.test(parts[1])) {
    return { type: 'date', date: parts[1] }
  }

  // time:HH — выбор часа начала (0–23)
  if (prefix === 'time' && parts.length === 2) {
    const hour = parseInt(parts[1], 10)
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      return { type: 'time', hour }
    }
  }

  // dur:H — продолжительность в часах (1–8)
  if (prefix === 'dur' && parts.length === 2) {
    const hours = parseInt(parts[1], 10)
    if (Number.isInteger(hours) && hours >= 1 && hours <= 8) {
      return { type: 'dur', hours }
    }
  }

  // confirm_custom — подтверждение брони с параметрами из сессии
  if (data === 'confirm_custom') {
    return { type: 'confirm_custom' }
  }

  return null
}

/**
 * Проверяет, что callback содержит известное действие главного меню.
 */
function isMenuAction(value: string | undefined): value is MenuAction {
  // Явный список не даёт принять произвольное menu-действие.
  return value === 'start' || value === 'help' || value === 'book' || value === 'slots' || value === 'bookings' || value === 'stats'
}

/**
 * Проверяет, что id из callback_data состоит только из безопасных символов.
 */
function isSafeToken(value: string | undefined): value is string {
  // Safe token нужен для id из callback_data.
  return typeof value === 'string' && value.length > 0 && SAFE_TOKEN.test(value)
}
