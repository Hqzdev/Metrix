// Уровни логирования, которые использует booking-service.
type LogLevel = 'info' | 'warn' | 'error'

// Структура одной JSON-записи лога.
type LogEntry = {
  // Машиночитаемое действие, например database.seed.
  action?: string
  // Ошибка, если логируем исключение.
  error?: unknown
  // Человекочитаемое сообщение.
  message: string
  // requestId связывает записи одного HTTP-запроса.
  requestId?: string
  // Имя сервиса фиксировано для фильтрации логов.
  service: 'booking-service'
  // Дополнительные поля: bookingId, userId, deletedCount и так далее.
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи booking-service.
 */
export class BookingServiceLogger {
  /**
   * Пишет информационное событие в структурированный лог.
   */
  info(entry: LogEntry): void {
    this.write('info', entry)
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
    // Собираем финальный объект лога.
    const payload = {
      ...entry,
      // Error надо превратить в plain object, иначе JSON.stringify потеряет важные поля.
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    // Один лог = одна JSON-строка.
    const line = JSON.stringify(payload)
    if (level === 'error') {
      // Ошибки пишем в stderr.
      console.error(line)
      return
    }

    // Обычные события пишем в stdout.
    console.log(line)
  }
}

/**
 * Преобразует Error в объект, который нормально сериализуется в JSON.
 */
function serializeError(error: Error): { message: string; name: string; stack?: string } {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}
