/**
 * Базовая ошибка analytics-service.
 *
 * Хранит HTTP status code рядом с сообщением, чтобы router мог быстро
 * превратить ошибку в HTTP-ответ.
 */
export class AnalyticsServiceError extends Error {
  /**
   * Создаёт ошибку с текстом и HTTP-кодом.
   */
  constructor(
    message: string,
    // HTTP-код, который нужно вернуть клиенту.
    public readonly statusCode: number,
  ) {
    super(message)
    // name помогает понять конкретный тип ошибки в логах.
    this.name = new.target.name
  }
}

/**
 * Ошибка входных данных.
 */
export class ValidationError extends AnalyticsServiceError {
  /**
   * 400 означает, что клиент прислал неправильный payload.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка service-to-service авторизации.
 */
export class AuthenticationError extends AnalyticsServiceError {
  /**
   * 401 означает, что подпись запроса не прошла проверку.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Ошибка повторного requestId.
 */
export class ReplayAttackError extends AnalyticsServiceError {
  /**
   * 409 показывает, что запрос уже недавно принимался.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Ошибка отсутствующего route-а или report-а.
 */
export class NotFoundError extends AnalyticsServiceError {
  /**
   * 404 означает, что нужный ресурс не найден.
   */
  constructor() {
    super('not found', 404)
  }
}

/**
 * Ошибка downstream-сервиса, например booking-service.
 *
 * Хранит реальный HTTP-код и тело ответа downstream-а, чтобы router мог
 * вернуть caller-у исходный контекст ошибки без маскировки под общий 502.
 */
export class DownstreamServiceError extends AnalyticsServiceError {
  /**
   * Сохраняет статус и тело ответа зависимого сервиса.
   */
  constructor(
    statusCode: number,
    // responseBody — распарсенный ответ downstream-а или fallback-объект.
    public readonly responseBody: unknown,
  ) {
    super('downstream service error', statusCode)
  }
}
