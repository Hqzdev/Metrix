import { createHash } from 'node:crypto'
import type { Redis } from 'ioredis'

// TTL чуть больше максимального TTL access token (15 минут),
// чтобы запись пережила оставшееся время жизни любого отозванного токена
const BLACKLIST_TTL_SECONDS = 16 * 60

const BLACKLIST_KEY_PREFIX = 'security:blacklist:'

/**
 * Добавляет access token в blacklist.
 *
 * Вызывается при logout и смене пароля, чтобы мгновенно инвалидировать токен
 * без ожидания его естественного истечения.
 *
 * важно:
 * - в Redis хранится SHA-256 хеш токена, не сам токен.
 *   Если Redis скомпрометирован — атакующий не получает токены напрямую.
 * - TTL записи = BLACKLIST_TTL_SECONDS: запись удаляется сама, очистка не нужна.
 */
export async function revokeToken(token: string, redis: Redis): Promise<void> {
  const key = buildKey(token)
  await redis.set(key, '1', 'EX', BLACKLIST_TTL_SECONDS)
}

/**
 * Проверяет, был ли access token отозван.
 *
 * Возвращает true если токен в blacklist — запрос нужно отклонить с 401,
 * даже если подпись JWT валидна.
 */
export async function isTokenRevoked(token: string, redis: Redis): Promise<boolean> {
  const key = buildKey(token)
  const value = await redis.get(key)
  return value !== null
}

/**
 * Строит Redis-ключ: SHA-256 хеш токена + префикс.
 *
 * Фиксированная длина ключа и отсутствие чувствительных данных —
 * основные требования к ключу blacklist.
 */
function buildKey(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex')
  return `${BLACKLIST_KEY_PREFIX}${hash}`
}
