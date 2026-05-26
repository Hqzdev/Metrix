import type { Redis } from 'ioredis'

// Сессия пользователя живёт один час после последнего шага.
const SESSION_TTL_SEC = 60 * 60

// Все возможные шаги Telegram booking flow.
export type BotSessionState =
  | 'START'
  | 'SELECT_LOCATION'
  | 'SELECT_ROOM'
  | 'SELECT_DATE'
  | 'SELECT_START_TIME'
  | 'SELECT_DURATION'
  | 'SELECT_TIME'
  | 'CONFIRM_BOOKING'
  | 'PAYMENT'

export type BotSessionPatch = {
  // Optional optimistic lock: обновлять только ожидаемую версию.
  expectedVersion?: number
  locationId?: string
  resourceId?: string
  selectedDate?: string
  selectedDuration?: number
  selectedHour?: number
  slotId?: string
  state: BotSessionState
}

// Интерфейс хранилища пользовательских сессий.
export type UserSessionStore = {
  clearRescheduleFromId(telegramUserId: number): Promise<void>
  getRescheduleFromId(telegramUserId: number): Promise<string | null>
  getState(telegramUserId: number): Promise<BotSession | null>
  setRescheduleFromId(telegramUserId: number, bookingId: string): Promise<void>
  setState(telegramUserId: number, patch: BotSessionPatch): Promise<void>
}
 
export type BotSession = {
  locationId?: string
  resourceId?: string
  selectedDate?: string
  selectedDuration?: number
  selectedHour?: number
  slotId?: string
  state: BotSessionState
  // Когда session была обновлена.
  updatedAt: string
  // Версия нужна для защиты от гонок.
  version: number
}

/**
 * Хранит FSM-состояние Telegram-пользователя в Redis.
 *
 * Состояние не является источником истины для booking или payment.
 * Оно нужно только для восстановления диалога и наблюдаемости flow.
 *
 * reschedule intent хранится отдельным Redis-ключом, а не внутри сессии,
 * потому что сессия перезаписывается при каждом шаге booking-flow и поле
 * было бы потеряно до завершения оплаты.
 */
export class RedisUserSessionStore implements UserSessionStore {
  /**
   * Сохраняет Redis client.
   */
  constructor(private readonly redis: Redis) {}

  /**
   * Обновляет состояние пользователя и продлевает TTL.
   */
  async setState(telegramUserId: number, patch: BotSessionPatch): Promise<void> {
    // Ключ привязан к Telegram user id.
    const key = sessionKey(telegramUserId)
    // В payload кладём только поля текущего flow.
    const payload = JSON.stringify({
      locationId: patch.locationId,
      resourceId: patch.resourceId,
      selectedDate: patch.selectedDate,
      selectedDuration: patch.selectedDuration,
      selectedHour: patch.selectedHour,
      slotId: patch.slotId,
      state: patch.state,
      updatedAt: new Date().toISOString(),
    })
    // Пустая строка означает "не проверять expectedVersion".
    const expectedVersion = patch.expectedVersion === undefined ? '' : String(patch.expectedVersion)
    // Lua-скрипт атомарно обновляет session и увеличивает version.
    const result = await this.redis.eval(SET_SESSION_SCRIPT, 1, key, payload, String(SESSION_TTL_SEC), expectedVersion)
    if (result !== 1) {
      throw new Error('telegram session version conflict')
    }
  }

  /**
   * Возвращает текущее состояние диалога для восстановления UI.
   */
  async getState(telegramUserId: number): Promise<BotSession | null> {
    // Если ключ истёк, сессии больше нет.
    const raw = await this.redis.get(sessionKey(telegramUserId))
    if (!raw) return null

    // Неполную или повреждённую session игнорируем.
    const parsed = JSON.parse(raw) as Partial<BotSession>
    if (!parsed.state || !parsed.updatedAt || typeof parsed.version !== 'number') return null

    return parsed as BotSession
  }

  /**
   * Сохраняет ID бронирования для переноса.
   *
   * Хранится отдельно от сессии, чтобы выжить через все setState-вызовы booking-flow.
   */
  async setRescheduleFromId(telegramUserId: number, bookingId: string): Promise<void> {
    await this.redis.set(rescheduleKey(telegramUserId), bookingId, 'EX', SESSION_TTL_SEC)
  }

  /**
   * Возвращает ID бронирования, которое переносится, или null.
   */
  async getRescheduleFromId(telegramUserId: number): Promise<string | null> {
    return this.redis.get(rescheduleKey(telegramUserId))
  }

  /**
   * Удаляет reschedule intent после успешного переноса или сброса.
   */
  async clearRescheduleFromId(telegramUserId: number): Promise<void> {
    await this.redis.del(rescheduleKey(telegramUserId))
  }
}

/**
 * Строит Redis-ключ intent-а переноса бронирования.
 */
function rescheduleKey(telegramUserId: number): string {
  // Отдельный ключ для intent переноса бронирования.
  return `telegram:reschedule-from:${telegramUserId}`
}

/**
 * Строит Redis-ключ FSM-сессии Telegram-пользователя.
 */
function sessionKey(telegramUserId: number): string {
  // Основная session пользователя.
  return `telegram:session:${telegramUserId}`
}

// Lua-скрипт атомарно обновляет session, TTL и version.
const SET_SESSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
local expected = ARGV[3]
if expected ~= "" then
  if not current then
    return 0
  end
  local current_data = cjson.decode(current)
  if tonumber(current_data.version or 0) ~= tonumber(expected) then
    return 0
  end
end
local next_data = cjson.decode(ARGV[1])
local next_version = 1
if current then
  local current_data = cjson.decode(current)
  next_version = tonumber(current_data.version or 0) + 1
end
next_data.version = next_version
redis.call("SET", KEYS[1], cjson.encode(next_data), "EX", tonumber(ARGV[2]))
return 1
`
