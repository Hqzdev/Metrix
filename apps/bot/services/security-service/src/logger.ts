// три уровня достаточно — info для событий, warn для странностей, error для сбоев
type LogLevel = 'info' | 'warn' | 'error'

// базовая форма лог-записи; дополнительные поля разрешены через index signature
type LogEntry = {
  action?: string
  error?: unknown
  message: string
  requestId?: string
  service: 'security-service'
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи в stdout/stderr.
 *
 * Каждая запись — одна JSON-строка. Так log collector-ы (Loki, Datadog и т.д.)
 * парсят поля без хрупкого разбора строк.
 */
export class SecurityServiceLogger {
  /**
   * Пишет информационное событие — старт, успешные операции, счётчики.
   */
  info(entry: LogEntry): void {
    this.write('info', entry)
  }

  /**
   * Пишет предупреждение — необычные, но не критичные события.
   */
  warn(entry: LogEntry): void {
    this.write('warn', entry)
  }

  /**
   * Пишет ошибку — сбои, нарушения безопасности, неожиданные состояния.
   */
  error(entry: LogEntry): void {
    this.write('error', entry)
  }

  /**
   * Сериализует запись и отправляет в stdout или stderr.
   */
  private write(level: LogLevel, entry: LogEntry): void {
    const payload = {
      ...entry,
      // Error нельзя красиво сериализовать через JSON.stringify напрямую
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    const line = JSON.stringify(payload)

    // ошибки в stderr, остальное в stdout — log collector может маршрутизировать раздельно
    if (level === 'error') {
      console.error(line)
      return
    }

    console.log(line)
  }
}

/**
 * Извлекает читаемые поля из объекта Error для JSON-лога.
 */
function serializeError(error: Error): { message: string; name: string; stack?: string } {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}
