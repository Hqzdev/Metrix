/**
 * Ошибка при вызове Telegram Bot API.
 */
export class TelegramApiError extends Error {
  /**
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(
    public readonly method: string,
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(`Telegram ${method} failed with status ${statusCode}`)
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
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(filePath: string) {
    super(`Rejected unsafe filePath: ${filePath}`)
    this.name = new.target.name
  }
}
