/**
 * Базовая ошибка security-service.
 *
 * Содержит HTTP status code, чтобы обработчик ошибок мог быстро
 * превратить исключение в понятный HTTP-ответ без дополнительной логики.
 */
export class SecurityServiceError extends Error {
  /**
   * Создаёт ошибку с текстом и HTTP-кодом.
   */
  constructor(
    message: string,
    // statusCode — HTTP-статус, который получит клиент
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = new.target.name
  }
}

/**
 * Ошибка валидации: клиент прислал неверные данные.
 */
export class ValidationError extends SecurityServiceError {
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка аутентификации: запрос не прошёл проверку подписи или токен невалиден.
 */
export class AuthenticationError extends SecurityServiceError {
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Ошибка превышения лимита: вход заблокирован из-за brute-force защиты.
 *
 * 429 Too Many Requests — стандартный код для rate limiting.
 */
export class TooManyRequestsError extends SecurityServiceError {
  /**
   * retryAfterSeconds — через сколько секунд можно попробовать снова.
   */
  constructor(public readonly retryAfterSeconds: number) {
    super('too many failed login attempts', 429)
  }
}

/**
 * Ошибка replay attack: тот же requestId уже обрабатывался недавно.
 */
export class ReplayAttackError extends SecurityServiceError {
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Ошибка: ресурс не найден (неизвестный endpoint или запись).
 */
export class NotFoundError extends SecurityServiceError {
  constructor() {
    super('not found', 404)
  }
}
