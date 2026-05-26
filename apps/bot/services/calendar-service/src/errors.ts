/**
 * Базовая ошибка calendar-service.
 */
export class CalendarServiceError extends Error {
  /**
   * Создаёт ошибку с HTTP-кодом для ответа клиенту.
   */
  constructor(
    message: string,
    // HTTP status code для router-а.
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
export class ValidationError extends CalendarServiceError {
  /**
   * 400 означает неверный payload или query.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка service-to-service авторизации.
 */
export class AuthenticationError extends CalendarServiceError {
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
export class ReplayAttackError extends CalendarServiceError {
  /**
   * 409 означает конфликт: такой запрос уже был принят.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Ошибка отсутствующего подключения или route-а.
 */
export class NotFoundError extends CalendarServiceError {
  /**
   * 404 означает, что нужный ресурс не найден.
   */
  constructor() {
    super('not found', 404)
  }
}

/**
 * Ошибка, когда OAuth provider не настроен.
 */
export class ProviderNotConfiguredError extends CalendarServiceError {
  /**
   * 400 возвращаем, потому что текущий запрос невозможно выполнить с этим provider.
   */
  constructor() {
    super('provider not configured', 400)
  }
}

/**
 * Ошибка подписи OAuth state.
 */
export class OAuthStateError extends CalendarServiceError {
  /**
   * 400 означает, что callback state повреждён или подделан.
   */
  constructor() {
    super('invalid oauth state', 400)
  }
}

/**
 * Ошибка внешнего OAuth provider-а.
 *
 * Хранит реальный status и тело ответа Google, чтобы caller видел причину
 * отказа provider-а без маскировки под generic internal error.
 */
export class ProviderError extends CalendarServiceError {
  /**
   * Сохраняет статус и тело ответа OAuth provider-а.
   */
  constructor(
    statusCode: number,
    // responseBody — распарсенный ответ provider-а или fallback-объект.
    public readonly responseBody: unknown,
  ) {
    super('provider error', statusCode)
  }
}
