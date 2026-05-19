/**
 * Описывает CalendarServiceError и связанную с ним сервисную ответственность.
 */
export class CalendarServiceError extends Error {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = new.target.name
  }
}

/**
 * Описывает ValidationError и связанную с ним сервисную ответственность.
 */
export class ValidationError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Описывает AuthenticationError и связанную с ним сервисную ответственность.
 */
export class AuthenticationError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Описывает ReplayAttackError и связанную с ним сервисную ответственность.
 */
export class ReplayAttackError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Описывает NotFoundError и связанную с ним сервисную ответственность.
 */
export class NotFoundError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('not found', 404)
  }
}

/**
 * Описывает ProviderNotConfiguredError и связанную с ним сервисную ответственность.
 */
export class ProviderNotConfiguredError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('provider not configured', 400)
  }
}

/**
 * Описывает OAuthStateError и связанную с ним сервисную ответственность.
 */
export class OAuthStateError extends CalendarServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('invalid oauth state', 400)
  }
}
