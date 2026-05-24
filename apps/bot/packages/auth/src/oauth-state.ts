import { createHmac, timingSafeEqual } from 'node:crypto'
import type { OAuthStateData } from './types.js'

/**
 * Кодирует и подписывает OAuth state, чтобы его нельзя было подделать между redirect и callback.
 */
export function signOAuthState(data: OAuthStateData, secret: string): string {
  // payload — JSON в base64url, безопасный для URL.
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Проверяет и декодирует подписанный OAuth state.
 *
 * Бросает ошибку, если state повреждён или подделан.
 */
export function verifyOAuthState(state: string, secret: string): OAuthStateData {
  const lastDot = state.lastIndexOf('.')
  if (lastDot === -1) throw new Error('malformed oauth state')

  const payload = state.slice(0, lastDot)
  const givenSig = state.slice(lastDot + 1)
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')

  // Подпись проверяем timing-safe сравнением.
  const a = Buffer.from(givenSig, 'base64url')
  const b = Buffer.from(expectedSig, 'base64url')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('invalid oauth state signature')
  }

  // После проверки подписи можно доверять payload.
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as OAuthStateData
}
