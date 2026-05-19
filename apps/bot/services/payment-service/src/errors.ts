/**
 * Описывает PaymentServiceError и связанную с ним сервисную ответственность.
 */
export class PaymentServiceError extends Error {
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
export class ValidationError extends PaymentServiceError {
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
export class AuthenticationError extends PaymentServiceError {
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
export class ReplayAttackError extends PaymentServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('replay detected', 409)
  }
}

/**
 * Описывает ConflictError и связанную с ним сервисную ответственность.
 */
export class ConflictError extends PaymentServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message, 409)
  }
}

/**
 * Описывает NotFoundError и связанную с ним сервисную ответственность.
 */
export class NotFoundError extends PaymentServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message = 'not found') {
    super(message, 404)
  }
}

/**
 * Описывает DownstreamServiceError и связанную с ним сервисную ответственность.
 */
export class DownstreamServiceError extends Error {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
