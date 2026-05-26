// Redis по умолчанию для локального запуска.
const DEFAULT_REDIS_URL = 'redis://localhost:6379'
// Calendar-service внутри docker-сети.
const DEFAULT_CALENDAR_SERVICE_URL = 'http://calendar-service:3002'
// Директория отчётов по умолчанию.
const DEFAULT_REPORTS_DIR = '/tmp/reports'

export type WorkerServiceConfig = {
  calendarServiceUrl: string
  calendarSigningSecret: string
  databaseUrl: string
  redisPassword?: string
  redisUrl: string
  reportsDir: string
}

/**
 * Читает и валидирует runtime-конфигурацию worker-service.
 */
export function readWorkerServiceConfig(env: NodeJS.ProcessEnv): WorkerServiceConfig {
  return {
    calendarServiceUrl: env.CALENDAR_SERVICE_URL ?? DEFAULT_CALENDAR_SERVICE_URL,
    calendarSigningSecret: requireEnv(env, 'CALENDAR_SIGNING_SECRET'),
    databaseUrl: requireEnv(env, 'DATABASE_URL'),
    redisPassword: readOptionalEnv(env, 'REDIS_PASSWORD'),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    reportsDir: env.REPORTS_DIR ?? DEFAULT_REPORTS_DIR,
  }
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

/**
 * Возвращает optional env только если он реально заполнен.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
