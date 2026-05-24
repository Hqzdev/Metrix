import type { TrustedCaller } from '@metrix/auth'

// порт по умолчанию для локального запуска
const DEFAULT_PORT = 3008
const DEFAULT_REDIS_URL = 'redis://localhost:6379'

// тип описывает всё, что нужно security-service во время работы
export type SecurityServiceConfig = {
  // порт, на котором слушает HTTP-сервер
  port: number
  // адрес Redis для blacklist и rate limiter
  redisUrl: string
  // секрет для подписи исходящих запросов к другим сервисам
  signingSecret: string
  // сервисы, которым разрешено обращаться к security-service
  trustedCallers: TrustedCaller[]
  // ключи для подписи и проверки JWT
  jwtKeys: JwtKeysConfig
}

// набор ключей для JWT — текущий и предыдущие (для плавной ротации)
export type JwtKeysConfig = {
  // id и секрет текущего ключа (им подписываются новые токены)
  currentId: string
  currentSecret: string
  // предыдущие ключи через запятую в формате id:secret,id2:secret2
  // нужны на период ротации, чтобы старые токены продолжали работать
  previous: Array<{ id: string; secret: string }>
}

/**
 * Читает и валидирует конфигурацию сервиса при старте.
 *
 * важно:
 * - JWT-секрет живёт только здесь — никакой другой сервис не должен его знать.
 * - отсутствие обязательных переменных ломает старт, а не проявляется в runtime.
 * - previous-ключи опциональны и нужны только во время ротации JWT-секрета.
 */
export function readSecurityServiceConfig(env: NodeJS.ProcessEnv): SecurityServiceConfig {
  const signingSecret = requireEnv(env, 'SECURITY_SIGNING_SECRET')
  const currentId = env.JWT_KEY_ID?.trim() || 'v1'
  const currentSecret = requireEnv(env, 'JWT_SECRET')

  return {
    jwtKeys: {
      currentId,
      currentSecret,
      previous: parsePreviousKeys(env.JWT_PREVIOUS_KEYS),
    },
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    signingSecret,
    // bot-gateway и admin-service — единственные сервисы, которым нужна auth
    trustedCallers: [
      {
        name: 'bot-gateway',
        secret: readTrustedSecrets(env, 'TRUSTED_GATEWAY_SECRET'),
      },
      {
        name: 'admin-service',
        secret: readTrustedSecrets(env, 'TRUSTED_ADMIN_SECRET'),
      },
    ],
  }
}

/**
 * Парсит предыдущие JWT-ключи из строки формата "id1:secret1,id2:secret2".
 *
 * Пустая строка или отсутствие переменной — нормально, означает "нет предыдущих ключей".
 */
function parsePreviousKeys(raw: string | undefined): Array<{ id: string; secret: string }> {
  if (!raw || raw.trim() === '') return []

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colonIndex = part.indexOf(':')
      if (colonIndex === -1) throw new Error(`JWT_PREVIOUS_KEYS: invalid format in "${part}", expected "id:secret"`)
      const id = part.slice(0, colonIndex).trim()
      const secret = part.slice(colonIndex + 1).trim()
      if (!id || !secret) throw new Error(`JWT_PREVIOUS_KEYS: id and secret must not be empty in "${part}"`)
      return { id, secret }
    })
}

/**
 * Преобразует PORT из env в число и проверяет допустимый диапазон.
 */
function readPort(rawPort: string | undefined): number {
  if (!rawPort || rawPort.trim() === '') return DEFAULT_PORT

  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Читает обязательную переменную окружения — падает при пустом значении.
 */
function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}

/**
 * Читает текущий и следующий секрет для плавной ротации ключей сервисной подписи.
 */
function readTrustedSecrets(env: NodeJS.ProcessEnv, name: string): string[] {
  const current = requireEnv(env, name)
  const next = env[`${name}_NEXT`]
  return [current, ...(next && next.trim() ? [next.trim()] : [])]
}
