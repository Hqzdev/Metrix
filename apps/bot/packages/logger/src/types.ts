// Три уровня — стандартный минимум для production систем.
// debug намеренно не включён: в production он создаёт шум и никогда не читается.
export type LogLevel = 'info' | 'warn' | 'error'

/**
 * Обязательные поля каждой лог-записи.
 *
 * Эти поля гарантированы в каждой строке лога — их можно использовать
 * как фильтры в Grafana Loki без проверки на наличие.
 */
export type LogBase = {
  // Уровень: info | warn | error.
  level: LogLevel
  // ISO 8601 timestamp с миллисекундами. Loki использует его для сортировки.
  timestamp: string
  // Имя сервиса. Основной label в Loki: {service="booking-service"}.
  service: string
  // Окружение: development | staging | production.
  env: string
  // hostname контейнера — помогает при дебаге multi-replica сценариев.
  hostname: string
  // PID процесса — помогает найти краши в multi-process окружениях.
  pid: number
  // traceId из OpenTelemetry — связывает лог со span-ом в Jaeger/Tempo.
  // undefined если запрос не трейсируется или tracing не инициализирован.
  traceId?: string
  // spanId из OpenTelemetry — позволяет найти точный span внутри трейса.
  spanId?: string
  // Сериализованная ошибка, если логируем исключение.
  error?: SerializedError
  // Человекочитаемое сообщение.
  message: string
}

// Сериализованная форма Error объекта (JSON-safe).
export type SerializedError = {
  message: string
  name: string
  stack?: string
  // cause поддерживается в Node.js 16.9+ и Error.cause ES2022.
  cause?: SerializedError
}

/**
 * Входные данные для .info() / .warn() / .error().
 *
 * Сервис передаёт свои бизнес-поля через index signature: bookingId, userId,
 * requestId, action и любые другие. Они попадают в JSON как есть.
 */
export type LogInput = {
  message: string
  error?: unknown
  [key: string]: unknown
}

/**
 * Публичный интерфейс логгера.
 *
 * Совместим с ObservabilityLogger из @metrix/observability —
 * логгеры из этого пакета можно передавать туда напрямую.
 */
export interface ServiceLogger {
  info(input: LogInput): void
  warn(input: LogInput): void
  error(input: LogInput): void
}
