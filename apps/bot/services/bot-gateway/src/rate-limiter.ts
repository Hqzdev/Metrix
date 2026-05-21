import type { Redis } from 'ioredis'

const RATE_LIMIT = 10
const RATE_WINDOW_SEC = 10

/**
 * Создаёт fixed-window rate limiter для Telegram users.
 *
 * Redis используется вместо in-memory счётчика, чтобы лимит переживал restart
 * процесса и корректно работал при нескольких gateway instances.
 */
export function createRateLimiter(redis: Redis): (userId: number) => Promise<boolean> {
  return async function rateLimit(userId: number): Promise<boolean> {
    const window = Math.floor(Date.now() / (RATE_WINDOW_SEC * 1000))
    const key = `ratelimit:${userId}:${window}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SEC)
    }

    return count <= RATE_LIMIT
  }
}
