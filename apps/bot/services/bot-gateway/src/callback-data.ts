const MAX_CALLBACK_DATA_BYTES = 64
const SAFE_TOKEN = /^[A-Za-z0-9._-]+$/

type MenuAction = 'start' | 'help' | 'book' | 'slots' | 'bookings' | 'stats'

export type ParsedCallbackData =
  | { type: 'menu'; action: MenuAction }
  | { type: 'location'; locationId: string }
  | { type: 'resource'; locationId: string; resourceId: string }
  | { type: 'slot'; resourceId: string; slotId: string }
  | { type: 'confirm'; resourceId: string; slotId: string }
  | { type: 'cancel'; bookingId: string }
  | { type: 'cancel_confirm'; bookingId: string }
  | { type: 'calendar_disconnect'; provider: 'google' | 'microsoft' }

/**
 * Парсит Telegram callback_data в безопасную доменную команду.
 *
 * Telegram ограничивает callback_data 64 bytes.
 * Даже если кнопки генерирует наш UI, вход всё равно валидируется:
 * пользователь может прислать callback вручную или из старого сообщения.
 */
export function parseCallbackData(data: string): ParsedCallbackData | null {
  if (Buffer.byteLength(data, 'utf8') > MAX_CALLBACK_DATA_BYTES) return null

  const parts = data.split(':')
  const [prefix] = parts

  if (prefix === 'menu' && parts.length === 2 && isMenuAction(parts[1])) {
    return { type: 'menu', action: parts[1] }
  }

  if (prefix === 'location' && parts.length === 2 && isSafeToken(parts[1])) {
    return { type: 'location', locationId: parts[1] }
  }

  if (prefix === 'resource' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    return { type: 'resource', locationId: parts[1], resourceId: parts[2] }
  }

  if (prefix === 'slot' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    return { type: 'slot', resourceId: parts[1], slotId: parts[2] }
  }

  if (prefix === 'confirm' && parts.length === 3 && isSafeToken(parts[1]) && isSafeToken(parts[2])) {
    return { type: 'confirm', resourceId: parts[1], slotId: parts[2] }
  }

  if (prefix === 'cancel' && parts.length === 2 && isSafeToken(parts[1])) {
    return { type: 'cancel', bookingId: parts[1] }
  }

  if (prefix === 'cancel_confirm' && parts.length === 2 && isSafeToken(parts[1])) {
    return { type: 'cancel_confirm', bookingId: parts[1] }
  }

  if (prefix === 'calendar' && parts.length === 3 && parts[1] === 'disconnect') {
    const provider = parts[2]
    if (provider === 'google' || provider === 'microsoft') {
      return { type: 'calendar_disconnect', provider }
    }
  }

  return null
}

function isMenuAction(value: string | undefined): value is MenuAction {
  return value === 'start' || value === 'help' || value === 'book' || value === 'slots' || value === 'bookings' || value === 'stats'
}

function isSafeToken(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && SAFE_TOKEN.test(value)
}
