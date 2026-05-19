type LogLevel = 'info' | 'warn' | 'error'

type LogEntry = {
  action?: string
  error?: unknown
  message: string
  requestId?: string
  service: 'analytics-service'
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи analytics-service.
 *
 * Структурный формат нужен для production monitoring и расследования ошибок
 * без ручного разбора произвольных строк.
 */
export class AnalyticsServiceLogger {
  /**
   * Пишет информационное событие в структурированный лог.
   */
  info(entry: LogEntry): void {
    this.write('info', entry)
  }

  /**
   * Пишет предупреждение в структурированный лог.
   */
  warn(entry: LogEntry): void {
    this.write('warn', entry)
  }

  /**
   * Пишет ошибку в структурированный лог.
   */
  error(entry: LogEntry): void {
    this.write('error', entry)
  }

  /**
   * Сериализует запись лога и отправляет её в stdout/stderr.
   */
  private write(level: LogLevel, entry: LogEntry): void {
    const payload = {
      ...entry,
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    const line = JSON.stringify(payload)
    if (level === 'error') {
      console.error(line)
      return
    }

    console.log(line)
  }
}

/**
 * Преобразует внутреннюю модель в публичный контракт ответа.
 */
function serializeError(error: Error): { message: string; name: string; stack?: string } {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}
