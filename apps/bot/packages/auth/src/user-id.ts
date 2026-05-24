import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

/**
 * Подписывает telegramUserId, чтобы downstream-сервисы доверяли, что он пришёл от bot-gateway.
 */
export function signUserId(userId: number, secret: string): string {
  return createHmac('sha256', secret).update(String(userId)).digest('hex')
}

/**
 * Достаёт и проверяет X-User-Id из headers.
 *
 * Возвращает undefined, если header отсутствует.
 * Бросает ошибку, если user id есть, но подпись неправильная.
 */
export function extractUserId(req: IncomingMessage, secret: string): number | undefined {
  const rawId = req.headers['x-user-id'] as string | undefined
  const rawSig = req.headers['x-user-sig'] as string | undefined

  if (!rawId) return undefined

  // Если user id есть, подпись обязательна.
  if (!rawSig) throw new Error('x-user-id present but x-user-sig missing')

  // Telegram user id должен быть положительным целым числом.
  const userId = Number(rawId)
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('invalid x-user-id')

  const expected = signUserId(userId, secret)
  const a = Buffer.from(rawSig, 'hex')
  const b = Buffer.from(expected, 'hex')

  // Сравниваем подпись безопасным способом.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid x-user-sig')
  }

  return userId
}
