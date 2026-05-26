import type { StorageConfig } from './types.js'

// Дефолты для локального docker-compose окружения.
const DEFAULT_MINIO_ENDPOINT = 'minio'
const DEFAULT_MINIO_PORT = 9000
const DEFAULT_USE_SSL = false

/**
 * Читает конфигурацию StorageClient из переменных окружения.
 *
 * MINIO_ACCESS_KEY и MINIO_SECRET_KEY обязательны — без них MinIO отвергнет
 * любой запрос. Остальные параметры имеют дефолты для docker-compose.
 */
export function readStorageConfig(env: NodeJS.ProcessEnv): StorageConfig {
  return {
    endpoint: env.MINIO_ENDPOINT ?? DEFAULT_MINIO_ENDPOINT,
    port: readPort(env.MINIO_PORT),
    useSSL: readBool(env.MINIO_USE_SSL, DEFAULT_USE_SSL),
    accessKey: requireEnv(env, 'MINIO_ACCESS_KEY'),
    secretKey: requireEnv(env, 'MINIO_SECRET_KEY'),
  }
}

/**
 * Парсит строковый порт в число и проверяет допустимый диапазон.
 */
function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_MINIO_PORT

  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('MINIO_PORT must be an integer between 1 and 65535')
  }

  return port
}

/**
 * Парсит строковое boolean значение ('true'/'false'/'1'/'0').
 */
function readBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultValue

  // Принимаем несколько вариантов написания для совместимости с разными форматами env.
  return raw === 'true' || raw === '1'
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
