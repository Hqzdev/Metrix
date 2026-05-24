/**
 * Базовая ошибка booking-service.
 *
 * В ней хранится HTTP status code, чтобы router мог вернуть правильный ответ
 * без отдельной таблицы соответствий.
 */
export class BookingServiceError extends Error {
  /**
   * Создаёт ошибку с текстом и HTTP-кодом.
   */
  constructor(
    message: string,
    // HTTP-статус, который нужно вернуть клиенту.
    public readonly statusCode: number,
  ) {
    super(message)
    // name помогает быстро понять тип ошибки в логах.
    this.name = new.target.name
  }
}

/**
 * Ошибка входных данных: тело запроса или параметры не прошли проверку.
 */
export class ValidationError extends BookingServiceError {
  /**
   * 400 означает, что клиент прислал неверные данные.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка service-to-service авторизации.
 */
export class AuthenticationError extends BookingServiceError {
  /**
   * 401 означает, что подпись запроса не прошла проверку.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Ошибка доступа: caller авторизован, но не имеет права на действие.
 */
export class ForbiddenError extends BookingServiceError {
  /**
   * 403 используем, например, когда пользователь пытается отменить чужую бронь.
   */
  constructor() {
    super('forbidden', 403)
  }
}

/**
 * Ошибка отсутствующего ресурса или маршрута.
 */
export class NotFoundError extends BookingServiceError {
  /**
   * 404 означает, что нужная запись или endpoint не найдены.
   */
  constructor(message = 'not found') {
    super(message, 404)
  }
}

/**
 * Ошибка конфликта состояния.
 */
export class ConflictError extends BookingServiceError {
  /**
   * 409 подходит для занятого слота или недопустимого перехода статуса.
   */
  constructor(message: string) {
    super(message, 409)
  }
}

/**
 * Ошибка повторного requestId.
 */
export class ReplayAttackError extends BookingServiceError {
  /**
   * 409 показывает, что такой запрос уже недавно обрабатывался.
   */
  constructor() {
    super('replay detected', 409)
  }
}
