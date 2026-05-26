/**
 * Ошибка при вызове Telegram Bot API.
 */
export class TelegramApiError extends Error {
  /**
   * Сохраняет метод Telegram API, HTTP-код и тело ответа.
   */
  constructor(
    // Метод Telegram, например sendMessage или sendDocument.
    public readonly method: string,
    // HTTP status code ответа Telegram.
    public readonly statusCode: number,
    // Тело ответа Telegram с деталями ошибки.
    public readonly body: string,
  ) {
    super(`Telegram ${method} failed with status ${statusCode}`)
    // name помогает отличать эту ошибку в логах.
    this.name = new.target.name
  }
}

/**
 * Попытка отправить файл за пределами разрешённой директории.
 *
 * Бросается при обнаружении path traversal в filePath.
 */
export class UnsafeFilePathError extends Error {
  /**
   * Создаёт ошибку с опасным путём, чтобы его было видно в логах.
   */
  constructor(filePath: string) {
    super(`Rejected unsafe filePath: ${filePath}`)
    // name помогает фильтровать ошибки path traversal.
    this.name = new.target.name
  }
}

/**
 * Ошибка в payload события уведомления.
 *
 * Бросается до вызова Telegram API, чтобы malformed Redis event не исчезал
 * молча и не выглядел как успешно отправленное уведомление.
 */
export class NotificationValidationError extends Error {
  /**
   * Создаёт validation-ошибку с причиной отказа.
   */
  constructor(message: string) {
    super(message)
    // name помогает отделить плохие входные события от сетевых ошибок Telegram.
    this.name = new.target.name
  }
}
