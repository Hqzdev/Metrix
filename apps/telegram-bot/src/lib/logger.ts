type LogMeta = Record<string, unknown>

export type Logger = {
  info(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  error(message: string, meta?: LogMeta): void
}

// выводит структурированные логи в json через console
export class ConsoleLogger implements Logger {
  // логирует информационное сообщение
  info(message: string, meta?: LogMeta): void {
    console.warn(JSON.stringify({ level: 'info', message, ...serializeMeta(meta) }))
  }

  // логирует предупреждение
  warn(message: string, meta?: LogMeta): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...serializeMeta(meta) }))
  }

  // логирует ошибку
  error(message: string, meta?: LogMeta): void {
    console.error(JSON.stringify({ level: 'error', message, ...serializeMeta(meta) }))
  }
}

// сериализует мета-данные, обрабатывая объекты ошибок
function serializeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, value instanceof Error ? serializeError(value) : value]),
  )
}

// конвертирует объект Error в простой объект для логирования
function serializeError(error: Error): LogMeta {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}
