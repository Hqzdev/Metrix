/**
 * Описывает ошибку внешнего HTTP/API вызова с кодом и телом ответа.
 */
class ServiceHttpError extends Error {
  /**
   * Создаёт ошибку, которую route handler может безопасно залогировать и отдать клиенту.
   */
  constructor(message, statusCode, responseBody) {
    super(message)
    this.name = 'ServiceHttpError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

module.exports = {
  ServiceHttpError,
}
