// Уровни логов calendar-service.
type LogLevel = 'info' | 'warn' | 'error'

// Структура одной JSON-записи.
type LogEntry = {
  // Машиночитаемое действие.
  action?: string
  // Ошибка, если лог связан с исключением.
  error?: unknown
  // Человекочитаемый текст.
  message: string
  // requestId связывает логи одного запроса.
  requestId?: string
  // Имя сервиса для фильтрации логов.
  service: 'calendar-service'
  // Дополнительный контекст.
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи в stdout/stderr.
 *
 * Структурированный формат позволяет production log collectors
 * парсить поля без хрупкого разбора строк.
 */
export class CalendarServiceLogger {
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
    // Собираем итоговый payload лога.
    const payload = {
      ...entry,
      // Error превращаем в обычный объект.
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    // Один лог — одна JSON-строка.
    const line = JSON.stringify(payload)

    if (level === 'error') {
      // Ошибки пишем в stderr.
      console.error(line)
      return
    }

    // Остальные события пишем в stdout.
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
