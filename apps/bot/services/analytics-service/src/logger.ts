// Поддерживаемые уровни логирования.
type LogLevel = 'info' | 'warn' | 'error'

// Одна структурированная запись лога.
type LogEntry = {
  // Машиночитаемое действие, например booking.created.
  action?: string
  // Ошибка, если логируем исключение.
  error?: unknown
  // Человекочитаемое сообщение.
  message: string
  // requestId помогает связать логи одного запроса.
  requestId?: string
  // Имя сервиса фиксировано для фильтрации.
  service: 'analytics-service'
  // Дополнительный контекст события.
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
    // Собираем итоговый JSON payload.
    const payload = {
      ...entry,
      // Error превращаем в обычный объект, чтобы не потерять message/name/stack.
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    // Один лог пишется одной строкой.
    const line = JSON.stringify(payload)
    if (level === 'error') {
      // Ошибки отправляем в stderr.
      console.error(line)
      return
    }

    // Info/warn отправляем в stdout.
    console.log(line)
  }
}

/**
 * Преобразует Error в JSON-safe объект.
 */
function serializeError(error: Error): { message: string; name: string; stack?: string } {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}
