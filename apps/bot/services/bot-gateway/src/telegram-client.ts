import type { InlineKeyboardMarkup, TelegramApiResponse, TelegramUpdate } from './telegram-types.js'

type SendOptions = { reply_markup?: InlineKeyboardMarkup }
type EditOptions = { reply_markup?: InlineKeyboardMarkup }

export class TelegramClient {
  private readonly base: string

  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`
  }

  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>('getUpdates', {
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      offset,
      timeout: 25,
    })
  }

  async sendMessage(chatId: number, text: string, options: SendOptions = {}): Promise<{ message_id: number }> {
    return this.call<{ message_id: number }>('sendMessage', { chat_id: chatId, text, ...options })
  }

  async editMessageText(chatId: number, messageId: number, text: string, options: EditOptions = {}): Promise<void> {
    await this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, ...options })
  }

  async answerCallbackQuery(id: string, text?: string): Promise<void> {
    await this.call('answerCallbackQuery', { callback_query_id: id, text })
  }

  async answerPreCheckoutQuery(id: string, input: { ok: true } | { ok: false; errorMessage: string }): Promise<void> {
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

  async setMyCommands(): Promise<void> {
    await this.call('setMyCommands', {
      commands: [
        { command: 'start', description: 'Open the booking menu' },
        { command: 'book', description: 'Book a room or desk' },
        { command: 'slots', description: 'See available slots' },
        { command: 'my_bookings', description: 'See your active bookings' },
        { command: 'calendar', description: 'Connect Google Calendar' },
        { command: 'help', description: 'Show help' },
      ],
    })
  }

  private async call<T = unknown>(method: string, payload: unknown): Promise<T> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t))

    const body = (await res.json()) as TelegramApiResponse<T>
    if (!res.ok || !body.ok) throw new Error(body.description ?? `Telegram ${method} failed`)
    return body.result as T
  }
}
