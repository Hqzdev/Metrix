// Уровни логов, которые использует notification-service.
type LogLevel = 'info' | 'warn' | 'error'

// Одна JSON-запись лога.
type LogEntry = {
  // Машиночитаемое действие, например telegram.sendMessage.failed.
  action?: string
  // Ошибка, если логируем исключение.
  error?: unknown
  // Человекочитаемый текст.
  message: string
  // Имя сервиса фиксировано для фильтрации.
  service: 'notification-service'
  // Дополнительный контекст: statusCode, telegramBody и так далее.
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи в stdout/stderr.
 */
export class NotificationServiceLogger {
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
    // Собираем payload и добавляем технические поля.
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
