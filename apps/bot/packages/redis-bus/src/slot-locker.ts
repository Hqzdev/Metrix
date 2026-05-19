import type Redis from 'ioredis'

// время жизни блокировки: достаточно для завершения DB-транзакции с запасом
const LOCK_TTL_MS = 10_000

// Lua-скрипт атомарного release: удаляем ключ только если token совпадает.
// Без этого один сервис может снять блокировку другого при истечении TTL.
const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`

/**
 * Распределённая блокировка слота через Redis SET NX PX.
 *
 * Проблема без блокировки:
 *   Два параллельных запроса оба читают "слот свободен" внутри транзакции,
 *   оба создают booking, один из них побеждает на DB unique constraint,
 *   но пользователь второго получает 500 вместо корректного 409.
 *
 * Решение:
 *   Перед транзакцией захватываем Redis-лок на (resourceId, slotId).
 *   Если захват не удался — слот уже бронируется, сразу возвращаем ConflictError.
 *   Лок освобождается после транзакции (commit или rollback).
 *   TTL 10 с гарантирует автоснятие при краше процесса.
 */
export class SlotLocker {
  constructor(private readonly redis: Redis) {}

  /**
   * Захватывает блокировку на слот.
   *
   * @returns уникальный token для последующего release, или null если слот уже заблокирован
   */
  async acquire(resourceId: string, slotId: string): Promise<string | null> {
    const key = lockKey(resourceId, slotId)
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const result = await this.redis.set(key, token, 'PX', LOCK_TTL_MS, 'NX')
    return result === 'OK' ? token : null
  }

  /**
   * Освобождает блокировку — только если токен совпадает.
   * Игнорирует ошибку если блокировка уже истекла.
   */
  async release(resourceId: string, slotId: string, token: string): Promise<void> {
    const key = lockKey(resourceId, slotId)
    await this.redis.eval(RELEASE_SCRIPT, 1, key, token)
  }
}

function lockKey(resourceId: string, slotId: string): string {
  return `lock:slot:${resourceId}:${slotId}`
}
