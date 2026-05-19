import type { TrustedCaller } from '@metrix/auth'

const DEFAULT_PORT = 3002
const DEFAULT_REDIS_URL = 'redis://localhost:6379'
const DEFAULT_GOOGLE_REDIRECT_URI = 'http://localhost:3000/calendar/google/callback'

export type CalendarServiceConfig = {
  googleClientId: string
  googleClientSecret: string
  googleRedirectUri: string
  port: number
  redisUrl: string
  tokenSecret: string
  trustedCallers: TrustedCaller[]
  userIdSigningSecret: string
}

/**
 * Читает и валидирует конфигурацию при старте процесса.
 *
 * Секреты шифрования и OAuth-ключи проверяются здесь, а не при первом
 * использовании — слабая конфигурация должна ломать старт, а не проявляться
 * в runtime через утечки или молчаливые fallback.
 */
export function readCalendarServiceConfig(env: NodeJS.ProcessEnv): CalendarServiceConfig {
  const tokenSecret = requireEnv(env, 'CALENDAR_TOKEN_SECRET')
  const googleRedirectUri = env.GOOGLE_REDIRECT_URI ?? DEFAULT_GOOGLE_REDIRECT_URI

  // HTTPS обязателен для OAuth callback в production, чтобы исключить перехват code
  if (env.NODE_ENV === 'production' && !googleRedirectUri.startsWith('https://')) {
    throw new Error('GOOGLE_REDIRECT_URI must use HTTPS in production')
  }

  return {
    googleClientId: env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    googleRedirectUri,
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    tokenSecret,
    trustedCallers: [{ name: 'bot-gateway', secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET') }],
    userIdSigningSecret: env.USER_ID_SIGNING_SECRET ?? '',
  }
}

/**
 * Преобразует PORT из окружения и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') return DEFAULT_PORT

  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Возвращает обязательную переменную окружения или падает при пустом значении.
 */
function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  return [requireEnv(env, name), readOptionalEnv(env, `${name}_NEXT`)].filter((value): value is string => Boolean(value))
}

function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
