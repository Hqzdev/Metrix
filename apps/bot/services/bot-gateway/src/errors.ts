/**
 * Ошибка HTTP-вызова во внутренний сервис.
 *
 * Хранит HTTP status и тело ответа downstream-а, чтобы верхний уровень мог
 * отличать бизнес-конфликты от инфраструктурных ошибок без потери диагностики.
 */
export class ServiceHttpError extends Error {
  /**
   * Создаёт ошибку с методом, URL, HTTP-кодом и телом ответа downstream-а.
   */
  constructor(
    message: string,
    // HTTP status downstream-сервиса.
    public readonly statusCode: number,
    // Распарсенное тело ответа или fallback-объект.
    public readonly responseBody: unknown,
  ) {
    super(message)
    this.name = new.target.name
  }
}
