const { SERVICE_NAMES } = require('./config')

/**
 * Проверяет имя сервиса из URL и разрешает доступ только к известным вкладкам dashboard.
 */
function parseServiceName(value) {
  if (typeof value !== 'string' || !SERVICE_NAMES.has(value)) {
    const error = new Error('Unknown service')
    error.statusCode = 404
    throw error
  }

  return value
}

module.exports = {
  parseServiceName,
}
 