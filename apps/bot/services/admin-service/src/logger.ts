// Поддерживаем только три уровня, чтобы логи оставались простыми и предсказуемыми.
type LogLevel = 'info' | 'warn' | 'error'

// Базовая форма записи лога. Дополнительные поля разрешены через index signature.
type LogEntry = {
  // Машиночитаемое действие, например audit.retention.cleaned.
  action?: string
  // Ошибка может быть Error или любым другим значением.
  error?: unknown
  // Человекочитаемое описание события.
  message: string
  // requestId помогает связать логи одного запроса.
  requestId?: string
  // Имя сервиса фиксировано, чтобы не смешивать логи разных процессов.
  service: 'admin-service'
  // Позволяет добавлять контекст: userId, deletedCount, stream и так далее.
  [key: string]: unknown
}

/**
 * Пишет структурированные JSON-логи.
 *
 * Это позволяет production log collectors парсить поля без хрупкого разбора строк.
 */
export class AdminServiceLogger {
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
    // Собираем итоговый объект лога и добавляем технические поля.
    const payload = {
      ...entry,
      // Error нельзя напрямую красиво сериализовать через JSON.stringify.
      error: entry.error instanceof Error ? serializeError(entry.error) : entry.error,
      level,
      timestamp: new Date().toISOString(),
    }

    // Каждый лог — одна JSON-строка. Так его удобно читать log collector-ам.
    const line = JSON.stringify(payload)
    if (level === 'error') {
      // Ошибки пишем в stderr, остальные события — в stdout.
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
