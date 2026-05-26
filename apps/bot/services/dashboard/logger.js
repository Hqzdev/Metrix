const { hostname } = require('node:os')

const SERVICE_NAME = 'dashboard'

/**
 * Нормализует Error в JSON-friendly объект для структурных логов.
 */
function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return { message: String(error) }
}

/**
 * Пишет одну структурную строку лога в stdout или stderr.
 */
function write(level, message, fields = {}) {
  const record = {
    level, 
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    env: process.env.NODE_ENV || 'development',
    hostname: hostname(),
    pid: process.pid,
    message,
    ...fields,
  }

  const line = JSON.stringify(record)
  if (level === 'error') {
    process.stderr.write(`${line}\n`)
    return
  }

  process.stdout.write(`${line}\n`)
}

/**
 * Логирует информационное событие сервиса.
 */
function info(message, fields) {
  write('info', message, fields)
}

/**
 * Логирует предупреждение сервиса.
 */
function warn(message, fields) {
  write('warn', message, fields)
}

/**
 * Логирует ошибку сервиса в stderr.
 */
function error(message, err, fields = {}) {
  write('error', message, {
    ...fields,
    error: serializeError(err),
  })
}

module.exports = {
  error,
  info,
  warn,
}
