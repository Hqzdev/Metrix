import type { Redis } from 'ioredis'

// Redis key с последним сохранённым polling offset.
const OFFSET_KEY = 'telegram:updates:offset'
// Сколько храним отметку, что update уже обработан.
const PROCESSED_UPDATE_TTL_SEC = 7 * 24 * 60 * 60

// Lua-скрипт сохраняет offset только если новый offset больше текущего.
const SAVE_OFFSET_SCRIPT = `
  local current = redis.call("get", KEYS[1])
  if current == false or tonumber(current) < tonumber(ARGV[1]) then
    redis.call("set", KEYS[1], ARGV[1])
    return 1
  end
  return 0
`

// Интерфейс хранилища Telegram updates.
export type TelegramUpdateStore = {
  claimUpdate(updateId: number): Promise<boolean>
  readOffset(): Promise<number | undefined>
  saveOffset(offset: number): Promise<void>
}

/**
 * Хранит Telegram update idempotency и polling offset в Redis.
 *
 * processed key защищает от повторной обработки update после рестарта.
 * offset key позволяет bot-gateway продолжать polling с последней позиции.
 */
export class RedisTelegramUpdateStore implements TelegramUpdateStore {
  /**
   * Сохраняет Redis client.
   */
  constructor(private readonly redis: Redis) {}

  /**
   * Атомарно резервирует update для обработки.
   *
   * Возвращает false, если update уже видел другой gateway instance
   * или этот же процесс до рестарта.
   */
  async claimUpdate(updateId: number): Promise<boolean> {
    // NX означает "создать ключ только если его ещё нет".
    const result = await this.redis.set(processedUpdateKey(updateId), '1', 'EX', PROCESSED_UPDATE_TTL_SEC, 'NX')
    return result === 'OK'
  }

  /**
   * Возвращает сохранённый Telegram offset.
   */
  async readOffset(): Promise<number | undefined> {
    const raw = await this.redis.get(OFFSET_KEY)
    if (!raw) return undefined

    const offset = Number(raw)
    return Number.isInteger(offset) && offset > 0 ? offset : undefined
  }

  /**
   * Сохраняет offset монотонно.
   *
   * Старый gateway instance не должен перезаписать более новый offset меньшим значением.
   */
  async saveOffset(offset: number): Promise<void> {
    await this.redis.eval(SAVE_OFFSET_SCRIPT, 1, OFFSET_KEY, String(offset))
  }
}

function processedUpdateKey(updateId: number): string {
  // По одному ключу на каждый Telegram update_id.
  return `telegram:updates:processed:${updateId}`
}
