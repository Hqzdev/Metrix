import { readFile } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { TelegramApiError, UnsafeFilePathError } from './errors.js'
import type { NotificationServiceLogger } from './logger.js'

// Максимальное время ожидания Telegram API.
const REQUEST_TIMEOUT_MS = 10_000

// Зависимости TelegramClient.
type TelegramClientDependencies = {
  // Base URL вида https://api.telegram.org/bot<TOKEN>.
  baseUrl: string
  // Логгер notification-service.
  logger: NotificationServiceLogger
  // Директория, из которой разрешено отправлять документы.
  reportsDir: string
}

// Минимальная форма JSON-ответа Telegram Bot API.
type TelegramResponseBody = {
  description?: string
  ok?: boolean
}

/**
 * Отправляет сообщения через Telegram Bot API.
 *
 * важно:
 * - ошибки API логируются и не перебрасываются — delivery best-effort,
 *   повторная попытка управляется consumer на уровне Redis stream.
 * - timeout 10s на каждый запрос — медленный Telegram не блокирует consumer.
 * - send_document допускает только файлы из reportsDir — path traversal guard.
 */
export class TelegramClient {
  /**
   * Сохраняет настройки Telegram API и безопасной директории файлов.
   */
  constructor(private readonly deps: TelegramClientDependencies) {}

  /**
   * Отправляет текстовое сообщение пользователю.
   */
  async sendMessage(chatId: number, text: string, replyMarkup?: unknown): Promise<void> {
    await this.call('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup })
  }

  /**
   * Редактирует существующее сообщение Telegram.
   */
  async editMessage(chatId: number, messageId: number, text: string, replyMarkup?: unknown): Promise<void> {
    await this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup })
  }

  /**
   * Отправляет Telegram invoice для оплаты.
   */
  async sendInvoice(params: {
    chatId: number
    title: string
    description: string
    payload: string
    providerToken: string
    currency: string
    amount: number
  }): Promise<void> {
    // Telegram ждёт prices как массив позиций счёта.
    await this.call('sendInvoice', {
      chat_id: params.chatId,
      title: params.title,
      description: params.description,
      payload: params.payload,
      provider_token: params.providerToken,
      currency: params.currency,
      prices: [{ label: params.title, amount: params.amount }],
    })
  }

  /**
   * Отправляет файл из reportsDir пользователю.
   *
   * filePath проверяется против reportsDir перед чтением — это предотвращает
   * path traversal при подделанном сообщении в очереди.
   */
  async sendDocument(chatId: number, filePath: string, caption?: string): Promise<void> {
    const reportsRoot = resolve(this.deps.reportsDir)
    const safePath = resolve(reportsRoot, filePath)

    // Проверяем, что итоговый путь остался внутри reportsDir.
    if (!isInsideDirectory(reportsRoot, safePath)) {
      throw new UnsafeFilePathError(filePath)
    }

    // Читаем файл только после path traversal проверки.
    const fileBuffer = await readFile(safePath)
    // Telegram sendDocument принимает multipart/form-data.
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('document', new Blob([fileBuffer]), basename(safePath))
    if (caption) form.append('caption', caption)

    // Для файлов используем отдельный fetch, потому что body — FormData, а не JSON.
    const response = await fetch(`${this.deps.baseUrl}/sendDocument`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    await ensureTelegramResponseOk('sendDocument', response)
  }

  /**
   * Выполняет HTTP-вызов Telegram API и нормализует ошибки ответа.
   */
  private async call(method: string, payload: unknown): Promise<void> {
    // Большинство Telegram методов здесь вызываются JSON POST-запросом.
    const response = await fetch(`${this.deps.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    await ensureTelegramResponseOk(method, response)
  }
}

/**
 * Проверяет HTTP-level и Telegram-level успешность ответа.
 */
async function ensureTelegramResponseOk(method: string, response: Response): Promise<void> {
  const bodyText = await response.text()
  const body = parseTelegramBody(bodyText)

  // Telegram часто кладёт полезную диагностику в body, поэтому сохраняем его.
  if (!response.ok || body.ok === false) {
    const message = body.description ?? bodyText
    throw new TelegramApiError(method, response.status, message)
  }
}

/**
 * Разбирает JSON Telegram API, не теряя исходный текст при unexpected body.
 */
function parseTelegramBody(bodyText: string): TelegramResponseBody {
  if (!bodyText) return {}

  try {
    return JSON.parse(bodyText) as TelegramResponseBody
  } catch {
    return {}
  }
}

/**
 * Проверяет, что путь находится внутри разрешённой директории.
 */
function isInsideDirectory(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate)
  return relativePath !== '' && !relativePath.startsWith('..') && !isAbsolute(relativePath)
}
