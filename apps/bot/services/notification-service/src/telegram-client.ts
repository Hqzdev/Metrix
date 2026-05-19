import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { TelegramApiError, UnsafeFilePathError } from './errors.js'
import type { NotificationServiceLogger } from './logger.js'

const REQUEST_TIMEOUT_MS = 10_000

type TelegramClientDependencies = {
  baseUrl: string
  logger: NotificationServiceLogger
  reportsDir: string
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
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly deps: TelegramClientDependencies) {}

  /**
   * Отправляет данные пользователю или во внешний API.
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

  async sendInvoice(params: {
    chatId: number
    title: string
    description: string
    payload: string
    providerToken: string
    currency: string
    amount: number
  }): Promise<void> {
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
    const safePath = resolve(this.deps.reportsDir, basename(filePath))

    if (!safePath.startsWith(`${this.deps.reportsDir}/`)) {
      throw new UnsafeFilePathError(filePath)
    }

    const fileBuffer = await readFile(safePath)
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('document', new Blob([fileBuffer]), basename(safePath))
    if (caption) form.append('caption', caption)

    const response = await fetch(`${this.deps.baseUrl}/sendDocument`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new TelegramApiError('sendDocument', response.status, body)
    }
  }

  /**
   * Выполняет HTTP-вызов Telegram API и нормализует ошибки ответа.
   */
  private async call(method: string, payload: unknown): Promise<void> {
    const response = await fetch(`${this.deps.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new TelegramApiError(method, response.status, body)
    }
  }
}
