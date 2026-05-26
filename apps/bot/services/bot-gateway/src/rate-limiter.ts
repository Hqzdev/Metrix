import type { Redis } from 'ioredis'

// Максимум запросов от одного Telegram user за окно.
const RATE_LIMIT = 10
// Размер окна rate limit в секундах.
const RATE_WINDOW_SEC = 10

/**
 * Создаёт fixed-window rate limiter для Telegram users.
 *
 * Redis используется вместо in-memory счётчика, чтобы лимит переживал restart
 * процесса и корректно работал при нескольких gateway instances.
 */
export function createRateLimiter(redis: Redis): (userId: number) => Promise<boolean> {
  return async function rateLimit(userId: number): Promise<boolean> {
    // Fixed window: номер окна считается от текущего времени.
    const window = Math.floor(Date.now() / (RATE_WINDOW_SEC * 1000))
    // Ключ отдельный для каждого пользователя и окна.
    const key = `ratelimit:${userId}:${window}`
    // incr атомарен в Redis.
    const count = await redis.incr(key)

    // На первом запросе ставим TTL, чтобы ключ сам удалился.
    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SEC)
    } 

    // true означает "запрос разрешён".
    return count <= RATE_LIMIT
  }
}
