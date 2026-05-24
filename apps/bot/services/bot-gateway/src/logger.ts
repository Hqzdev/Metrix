// Уровни логов bot-gateway.
type LogLevel = 'info' | 'warn' | 'error'

// Одна JSON-запись лога.
type LogEntry = {
  // Машиночитаемое действие.
  action?: string
  // Ошибка, если есть.
  error?: unknown
  // Человекочитаемое сообщение.
  message: string
  // Имя сервиса.
  service: 'bot-gateway'
  // Дополнительный контекст.
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи bot-gateway.
 */
export class BotGatewayLogger {
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
    // Собираем финальный payload лога.
    const payload = {
      ...entry,
      // Error превращаем в plain object.
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
