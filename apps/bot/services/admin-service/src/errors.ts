/**
 * Базовая ошибка admin-service.
 *
 * Внутри неё сразу хранится HTTP status code, чтобы обработчик ошибок
 * мог быстро превратить исключение в понятный HTTP-ответ.
 */
export class AdminServiceError extends Error {
  /**
   * Создаёт ошибку с текстом для клиента и HTTP-кодом ответа.
   */
  constructor(
    message: string,
    // statusCode показывает, какой HTTP-статус нужно вернуть клиенту.
    public readonly statusCode: number,
  ) {
    super(message)
    // name нужен, чтобы в логах было видно точный класс ошибки.
    this.name = new.target.name
  }
}

/**
 * Ошибка валидации: клиент прислал неправильные данные.
 */
export class ValidationError extends AdminServiceError {
  /**
   * 400 означает, что запрос был понятен, но данные в нём неверные.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Ошибка авторизации: запрос не прошёл service-to-service проверку.
 */
export class AuthenticationError extends AdminServiceError {
  /**
   * 401 означает, что вызывающий сервис не доказал свою личность.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Ошибка replay attack: тот же requestId уже использовали недавно.
 */
export class ReplayAttackError extends AdminServiceError {
  /**
   * 409 показывает конфликт: такой запрос уже был обработан или принят.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Ошибка отсутствующего endpoint-а или ресурса.
 */
export class NotFoundError extends AdminServiceError {
  /**
   * 404 возвращаем, когда route или нужная запись не найдены.
   */
  constructor() {
    super('not found', 404)
  }
}

/**
 * Ошибка downstream-сервиса: запрос дошёл, но вернул нештатный HTTP-код.
 *
 * Используется в signed-http-client, чтобы пробросить реальный статус
 * вместо маскировки под 200 или 500. Это позволяет admin-router вернуть
 * клиенту тот же код, что вернул booking-service или payment-service.
 */
export class DownstreamError extends AdminServiceError {
  /**
   * Сохраняет тело ответа downstream, чтобы обработчик ошибок мог
   * передать его клиенту как есть, не теряя контекст ошибки.
   */
  constructor(
    statusCode: number,
    // responseBody — распарсенный JSON-ответ downstream-сервиса.
    public readonly responseBody: unknown,
  ) {
    super('downstream service error', statusCode)
  }
}
