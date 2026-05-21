import type { Redis } from 'ioredis'

const SESSION_TTL_SEC = 60 * 60

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
  expectedVersion?: number
  locationId?: string
  resourceId?: string
  selectedDate?: string
  selectedDuration?: number
  selectedHour?: number
  slotId?: string
  state: BotSessionState
}

export type UserSessionStore = {
  getState(telegramUserId: number): Promise<BotSession | null>
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
  updatedAt: string
  version: number
}

/**
 * Хранит FSM-состояние Telegram-пользователя в Redis.
 *
 * Состояние не является источником истины для booking или payment.
 * Оно нужно только для восстановления диалога и наблюдаемости flow.
 */
export class RedisUserSessionStore implements UserSessionStore {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly redis: Redis) {}

  /**
   * Обновляет состояние пользователя и продлевает TTL.
   */
  async setState(telegramUserId: number, patch: BotSessionPatch): Promise<void> {
    const key = sessionKey(telegramUserId)
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
    const expectedVersion = patch.expectedVersion === undefined ? '' : String(patch.expectedVersion)
    const result = await this.redis.eval(SET_SESSION_SCRIPT, 1, key, payload, String(SESSION_TTL_SEC), expectedVersion)
    if (result !== 1) {
      throw new Error('telegram session version conflict')
    }
  }

  /**
   * Возвращает текущее состояние диалога для восстановления UI.
   */
  async getState(telegramUserId: number): Promise<BotSession | null> {
    const raw = await this.redis.get(sessionKey(telegramUserId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<BotSession>
    if (!parsed.state || !parsed.updatedAt || typeof parsed.version !== 'number') return null

    return parsed as BotSession
  }
}

function sessionKey(telegramUserId: number): string {
  return `telegram:session:${telegramUserId}`
}

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
