/**
 * Базовая ошибка payment-service.
 */
export class PaymentServiceError extends Error {
  /**
   * Создаёт ошибку с HTTP status code.
   */
  constructor(
    message: string,
    // HTTP-код, который router вернёт клиенту.
    public readonly statusCode: number,
  ) {
    super(message)
    // name помогает отличать ошибки в логах.
    this.name = new.target.name
  }
}

/**
 * Ошибка входных данных.
 */
export class ValidationError extends PaymentServiceError {
  /**
   * 400 означает неправильный payload.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка service-to-service авторизации.
 */
export class AuthenticationError extends PaymentServiceError {
  /**
   * 401 означает неверную подпись запроса.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Ошибка повторного requestId.
 */
export class ReplayAttackError extends PaymentServiceError {
  /**
   * 409 означает, что запрос уже недавно принимался.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Конфликт состояния, например слот уже held/booked.
 */
export class ConflictError extends PaymentServiceError {
  /**
   * 409 просит caller перечитать состояние и попробовать другой сценарий.
   */
  constructor(message: string) {
    super(message, 409)
  }
}

/**
 * Ресурс или route не найден.
 */
export class NotFoundError extends PaymentServiceError {
  /**
   * 404 означает отсутствие invoice/resource/saga.
   */
  constructor(message = 'not found') {
    super(message, 404)
  }
}

/**
 * Ошибка runtime-конфигурации, которая блокирует платёжный сценарий.
 */
export class PaymentConfigurationError extends PaymentServiceError {
  /**
   * 503 означает, что сервис запущен, но временно не может выполнить операцию.
   */
  constructor(message: string) {
    super(message, 503)
  }
}

/**
 * Ошибка зависимого сервиса.
 */
export class DownstreamServiceError extends PaymentServiceError {
  /**
   * Сохраняет реальный HTTP-код и тело ответа downstream-сервиса.
   */
  constructor(
    statusCode: number,
    // responseBody — распарсенный JSON или текстовый fallback ответа downstream.
    public readonly responseBody: unknown,
  ) {
    super('downstream service error', statusCode)
  }
}
