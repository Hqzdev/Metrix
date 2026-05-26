/**
 * Читает положительное целое число из env или возвращает безопасный default.
 *
 * Dashboard запускается отдельно от TypeScript-сервисов, поэтому держим
 * минимальную runtime-валидацию рядом с CommonJS entrypoint.
 */
function readPositiveIntegerEnv(name, fallback) {
  const rawValue = process.env[name]
  if (rawValue === undefined || rawValue === '') return fallback

  const value = Number(rawValue)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}

// Список сервисов, которые dashboard показывает в UI.
const SERVICES = [
  // postgres/redis не имеют HTTP /ready, поэтому проверяем их только через Docker.
  { name: 'postgres', url: null },
  { name: 'redis', url: null },
  { name: 'bot-gateway', url: 'http://bot-gateway:3000' },
  { name: 'booking-service', url: 'http://booking-service:3001' },
  { name: 'calendar-service', url: 'http://calendar-service:3002' },
  { name: 'payment-service', url: 'http://payment-service:3003' },
  { name: 'analytics-service', url: 'http://analytics-service:3005' },
  { name: 'admin-service', url: 'http://admin-service:3006' },
  { name: 'security-service', url: 'http://security-service:3008' },
  { name: 'notification-service', url: null },
  { name: 'worker-service', url: null },
  // Инфраструктурные сервисы — проверяем только через Docker.
  { name: 'traefik', url: null },
  { name: 'minio', url: null },
  { name: 'prometheus', url: null },
  { name: 'grafana', url: null },
  { name: 'glitchtip', url: null },
]

const SERVICE_NAMES = new Set(SERVICES.map((service) => service.name))

module.exports = {
  DOCKER_SOCKET: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
  HTTP_TIMEOUT_MS: readPositiveIntegerEnv('HTTP_TIMEOUT_MS', 3000),
  PORT: readPositiveIntegerEnv('PORT', 9090),
  PROMETHEUS_URL: process.env.PROMETHEUS_URL ?? 'http://prometheus:9090',
  SERVICES,
  SERVICE_NAMES,
}
