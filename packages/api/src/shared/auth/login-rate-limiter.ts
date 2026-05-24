import type { Redis } from 'ioredis'

// сколько неудачных попыток разрешено до блокировки
const MAX_FAILURES = 5

// на сколько секунд блокируем после MAX_FAILURES неудач
const BASE_LOCKOUT_SECONDS = 60

// максимальная длительность блокировки (чтобы не блокировать навсегда)
const MAX_LOCKOUT_SECONDS = 30 * 60

// счётчик неудач живёт столько же, сколько максимальная блокировка
const FAILURE_TTL_SECONDS = MAX_LOCKOUT_SECONDS

const FAILURES_KEY_PREFIX = 'login:failures:'
const LOCKOUT_KEY_PREFIX = 'login:lockout:'

/**
 * Результат проверки: разрешён ли вход.
 *
 * allowed — можно пускать пользователя.
 * locked — вход заблокирован, retryAfterSeconds — когда можно попробовать снова.
 */
export type LoginCheckResult =
  | { status: 'allowed' }
  | { status: 'locked'; retryAfterSeconds: number }

/**
 * Проверяет, не заблокирован ли вход для данного идентификатора.
 *
 * Идентификатор — IP-адрес или userId. Рекомендуется вызывать дважды:
 * один раз для IP, один раз для userId, и блокировать если хоть один заблокирован.
 * Это защищает и от перебора по одному аккаунту, и от перебора с одного IP.
 */
export async function checkLoginAllowed(identifier: string, redis: Redis): Promise<LoginCheckResult> {
  const lockoutKey = buildLockoutKey(identifier)
  const ttl = await redis.ttl(lockoutKey)

  // ttl > 0 означает, что блокировка активна
  if (ttl > 0) {
    return { status: 'locked', retryAfterSeconds: ttl }
  }

  return { status: 'allowed' }
}

/**
 * Записывает неудачную попытку входа и при необходимости блокирует.
 *
 * Длительность блокировки растёт экспоненциально с количеством неудач:
 * - 5 неудач  → 1 минута
 * - 6 неудач  → 2 минуты
 * - 7 неудач  → 4 минуты
 * - ...максимум 30 минут
 *
 * Счётчик сбрасывается при успешном входе через resetLoginAttempts.
 */
export async function recordFailedLogin(identifier: string, redis: Redis): Promise<void> {
  const failuresKey = buildFailuresKey(identifier)

  // INCR атомарен — нет race condition при параллельных запросах
  const count = await redis.incr(failuresKey)

  // на первой неудаче ставим TTL, чтобы счётчик сам удалился
  if (count === 1) {
    await redis.expire(failuresKey, FAILURE_TTL_SECONDS)
  }

  // блокируем только когда порог достигнут
  if (count >= MAX_FAILURES) {
    const excessAttempts = count - MAX_FAILURES
    // экспоненциальный рост: каждая попытка сверх лимита удваивает блокировку
    const lockoutSeconds = Math.min(
      BASE_LOCKOUT_SECONDS * Math.pow(2, excessAttempts),
      MAX_LOCKOUT_SECONDS,
    )
    const lockoutKey = buildLockoutKey(identifier)
    // SET с EX — блокировка автоматически снимается через lockoutSeconds
    await redis.set(lockoutKey, '1', 'EX', Math.round(lockoutSeconds))
  }
}

/**
 * Сбрасывает счётчик неудач после успешного входа.
 *
 * Вызывается сразу после подтверждения пароля, до создания сессии.
 * Это предотвращает накопление счётчика от случайных опечаток.
 */
export async function resetLoginAttempts(identifier: string, redis: Redis): Promise<void> {
  const failuresKey = buildFailuresKey(identifier)
  const lockoutKey = buildLockoutKey(identifier)

  // удаляем оба ключа — и счётчик, и блокировку
  await redis.del(failuresKey, lockoutKey)
}

function buildFailuresKey(identifier: string): string {
  return `${FAILURES_KEY_PREFIX}${identifier}`
}

function buildLockoutKey(identifier: string): string {
  return `${LOCKOUT_KEY_PREFIX}${identifier}`
}
