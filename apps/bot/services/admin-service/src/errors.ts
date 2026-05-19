/**
 * Описывает AdminServiceError и связанную с ним сервисную ответственность.
 */
export class AdminServiceError extends Error {
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
export class ValidationError extends AdminServiceError {
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
export class AuthenticationError extends AdminServiceError {
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
export class ReplayAttackError extends AdminServiceError {
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
export class NotFoundError extends AdminServiceError {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor() {
    super('not found', 404)
  }
}
