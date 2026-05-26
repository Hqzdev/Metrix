import type { ErrorTrackerConfig } from './types.js'

// Дефолтная доля трейсов для performance monitoring.
// 10% достаточно для понимания картины без перегрузки Sentry квотой.
const DEFAULT_TRACES_SAMPLE_RATE = 0.1

// Дефолтная среда — development, чтобы ошибки локальных запусков не засоряли production-проект в Sentry.
const DEFAULT_ENVIRONMENT = 'development'

/**
 * Читает конфигурацию error-tracker из переменных окружения.
 *
 * Все поля опциональны: если SENTRY_DSN не задан, ErrorTracker
 * инициализируется в no-op режиме и не отправляет никаких данных.
 * Это позволяет использовать пакет без обязательной настройки Sentry.
 */
export function readErrorTrackerConfig(
  env: NodeJS.ProcessEnv,
  // Имя сервиса передаётся явно, чтобы каждый сервис не читал его из env по-своему.
  service: string,
): ErrorTrackerConfig {
  return {
    dsn: readOptionalEnv(env, 'SENTRY_DSN'),
    service,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? DEFAULT_ENVIRONMENT,
    tracesSampleRate: readSampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
  }
}

/**
 * Парсит SENTRY_TRACES_SAMPLE_RATE в допустимый диапазон [0, 1].
 */
function readSampleRate(raw: string | undefined): number {
  // Если переменная не задана, используем дефолт.
  if (raw === undefined || raw.trim() === '') return DEFAULT_TRACES_SAMPLE_RATE

  const value = Number(raw)
  if (Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error('SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1')
  }

  return value
}

/**
 * Возвращает непустую опциональную переменную окружения.
 */
function readOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]
  return value && value.trim() !== '' ? value : undefined
}
