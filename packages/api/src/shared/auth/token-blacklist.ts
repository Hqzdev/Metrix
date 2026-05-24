import { createHash } from 'node:crypto'
import type { Redis } from 'ioredis'

// TTL blacklist записи чуть больше максимального TTL access token (15 минут),
// чтобы запись точно пережила оставшееся время жизни любого отозванного токена.
const BLACKLIST_TTL_SECONDS = 16 * 60

const BLACKLIST_KEY_PREFIX = 'token:blacklist:'

/**
 * Добавляет access token в blacklist.
 *
 * Вызывается при logout и смене пароля, чтобы мгновенно инвалидировать токен
 * без ожидания его естественного истечения (15 минут).
 *
 * важно:
 * - в Redis хранится SHA-256 хеш токена, а не сам токен —
 *   если Redis скомпрометирован, атакующий не получит токены напрямую.
 * - TTL записи = BLACKLIST_TTL_SECONDS: после истечения запись удаляется сама.
 *   Дополнительная очистка не нужна.
 */
export async function revokeAccessToken(token: string, redis: Redis): Promise<void> {
  // хешируем токен перед сохранением — не храним чувствительные данные в Redis напрямую
  const key = buildBlacklistKey(token)
  await redis.set(key, '1', 'EX', BLACKLIST_TTL_SECONDS)
}

/**
 * Проверяет, был ли access token отозван.
 *
 * Возвращает true, если токен находится в blacklist.
 * В этом случае запрос должен быть отклонён с 401, даже если подпись валидна.
 */
export async function isAccessTokenRevoked(token: string, redis: Redis): Promise<boolean> {
  const key = buildBlacklistKey(token)
  const value = await redis.get(key)
  return value !== null
}

/**
 * Строит Redis-ключ для blacklist записи.
 *
 * Используем SHA-256 хеш токена вместо самого токена —
 * ключ получается фиксированной длины и не содержит чувствительных данных.
 */
function buildBlacklistKey(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex')
  return `${BLACKLIST_KEY_PREFIX}${hash}`
}
