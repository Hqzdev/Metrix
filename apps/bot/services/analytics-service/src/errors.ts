/**
 * Описывает AnalyticsServiceError и связанную с ним сервисную ответственность.
 */
export class AnalyticsServiceError extends Error {
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
export class ValidationError extends AnalyticsServiceError {
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
export class AuthenticationError extends AnalyticsServiceError {
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
export class ReplayAttackError extends AnalyticsServiceError {
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
export class NotFoundError extends AnalyticsServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('not found', 404)
  }
}

/**
 * Описывает DownstreamServiceError и связанную с ним сервисную ответственность.
 */
export class DownstreamServiceError extends AnalyticsServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 502)
  }
}
