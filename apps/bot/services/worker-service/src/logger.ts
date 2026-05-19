type LogEntry = Record<string, unknown>

/**
 * Структурированный JSON-логгер worker-service.
 * Формат совпадает с другими сервисами для единого парсинга в ELK/Loki.
 */
export class WorkerLogger {
  info(entry: LogEntry): void {
    console.log(JSON.stringify({ ...entry, level: 'info', timestamp: new Date().toISOString() }))
  }

  warn(entry: LogEntry): void {
    console.warn(JSON.stringify({ ...entry, level: 'warn', timestamp: new Date().toISOString() }))
  }

  error(entry: LogEntry): void {
    console.error(JSON.stringify({ ...entry, level: 'error', timestamp: new Date().toISOString() }))
  }
}
