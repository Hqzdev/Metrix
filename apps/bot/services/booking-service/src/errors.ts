/**
 * Описывает BookingServiceError и связанную с ним сервисную ответственность.
 */
export class BookingServiceError extends Error {
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
export class ValidationError extends BookingServiceError {
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
export class AuthenticationError extends BookingServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 401)
  }
}

/**
 * Описывает ForbiddenError и связанную с ним сервисную ответственность.
 */
export class ForbiddenError extends BookingServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('forbidden', 403)
  }
}

/**
 * Описывает NotFoundError и связанную с ним сервисную ответственность.
 */
export class NotFoundError extends BookingServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message = 'not found') {
    super(message, 404)
  }
}

/**
 * Описывает ConflictError и связанную с ним сервисную ответственность.
 */
export class ConflictError extends BookingServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 409)
  }
}

/**
 * Описывает ReplayAttackError и связанную с ним сервисную ответственность.
 */
export class ReplayAttackError extends BookingServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('replay detected', 409)
  }
}
