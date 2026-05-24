import type { InlineKeyboardMarkup, TelegramApiResponse, TelegramUpdate } from './telegram-types.js'

// Опции отправки сообщения в Telegram.
type SendOptions = { reply_markup?: InlineKeyboardMarkup; parse_mode?: string }
// Опции редактирования сообщения.
type EditOptions = { reply_markup?: InlineKeyboardMarkup; parse_mode?: string }

/**
 * Оборачивает методы Telegram Bot API, используемые сервисом.
 */
export class TelegramClient {
  // Base URL Telegram Bot API с токеном бота.
  private readonly base: string

  /**
   * Собирает base URL для Telegram Bot API.
   */
  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`
  }

  /**
   * Получает updates в polling mode.
   */
  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>('getUpdates', {
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      offset,
      timeout: 25,
    })
  }

  async sendMessage(chatId: number, text: string, options: SendOptions = {}): Promise<{ message_id: number }> {
    // sendMessage возвращает message_id, который можно потом редактировать.
    return this.call<{ message_id: number }>('sendMessage', { chat_id: chatId, text, ...options })
  }

  async editMessageText(chatId: number, messageId: number, text: string, options: EditOptions = {}): Promise<void> {
    try {
      await this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, ...options })
    } catch (error) {
      // Telegram ругается, если текст и клавиатура не изменились; для UX это не ошибка.
      if (isMessageNotModifiedError(error)) return
      throw error
    }
  }

  /**
   * Отвечает на служебный Telegram callback или payment query.
   */
  async answerCallbackQuery(id: string, text?: string): Promise<void> {
    await this.call('answerCallbackQuery', { callback_query_id: id, text })
  }

  async answerPreCheckoutQuery(id: string, input: { ok: true } | { ok: false; errorMessage: string }): Promise<void> {
    // Telegram требует ответить на pre_checkout_query перед списанием.
    await this.call('answerPreCheckoutQuery', {
      pre_checkout_query_id: id,
      ok: input.ok,
      error_message: input.ok ? undefined : input.errorMessage,
    })
  }

  async sendInvoice(input: {
    chatId: number
    title: string
    description: string
    payload: string
    providerToken: string
    currency: string
    prices: Array<{ label: string; amount: number }>
  }): Promise<void> {
    // sendInvoice сейчас оставлен как прямой helper, хотя основной путь идёт через notification-service.
    await this.call('sendInvoice', {
      chat_id: input.chatId,
      title: input.title,
      description: input.description,
      payload: input.payload,
      provider_token: input.providerToken,
      currency: input.currency,
      prices: input.prices,
    })
  }

  /**
   * Регистрирует команды, которые Telegram показывает пользователю в меню.
   */
  async setMyCommands(): Promise<void> {
    await this.call('setMyCommands', {
      commands: [
        { command: 'start', description: 'Open the booking menu' },
        { command: 'book', description: 'Book a room or desk' },
        { command: 'slots', description: 'See available slots' },
        { command: 'resume', description: 'Continue current booking flow' },
        { command: 'my_bookings', description: 'See your active bookings' },
        { command: 'calendar', description: 'Connect Google Calendar' },
        { command: 'help', description: 'Show help' },
        { command: 'stats', description: 'Admin: show booking statistics' },
      ],
    })
  }

  /**
   * Регистрирует production webhook для горизонтального scaling.
   */
  async setWebhook(url: string, secretToken: string): Promise<void> {
    await this.call('setWebhook', {
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      secret_token: secretToken || undefined,
      url,
    })
  }

  private async call<T = unknown>(method: string, payload: unknown): Promise<T> {
    // Отдельный AbortController нужен для таймаута Telegram API.
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 30_000)
    // Telegram Bot API вызываем JSON POST-запросом.
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t))

    // Telegram возвращает объект вида { ok, result, description }.
    const body = (await res.json()) as TelegramApiResponse<T>
    // Ошибка может быть как HTTP-level, так и Telegram-level ok:false.
    if (!res.ok || !body.ok) throw new Error(body.description ?? `Telegram ${method} failed`)
    return body.result as T
  }
}

/**
 * Проверяет ошибку Telegram "message is not modified".
 */
function isMessageNotModifiedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('message is not modified')
}
