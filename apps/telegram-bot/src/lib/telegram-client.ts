import type {
  EditMessageOptions,
  SendInvoiceInput,
  SendMessageOptions,
  TelegramApiResponse,
  TelegramUpdate,
} from './telegram-types.js'

type TelegramClientOptions = {
  token: string
}

// http-клиент для telegram bot api
export class TelegramClient {
  private readonly baseUrl: string

  constructor(options: TelegramClientOptions) {
    this.baseUrl = `https://api.telegram.org/bot${options.token}`
  }

  // получает новые обновления методом long polling
  async getUpdates(options: { offset?: number; timeoutSeconds: number }): Promise<TelegramUpdate[]> {
    const response = await this.request<TelegramUpdate[]>('getUpdates', {
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      offset: options.offset,
      timeout: options.timeoutSeconds,
    })

    return response
  }

  // отправляет текстовое сообщение в чат
  async sendMessage(chatId: number, text: string, options: SendMessageOptions = {}): Promise<void> {
    await this.request('sendMessage', {
      chat_id: chatId,
      text,
      ...options,
    })
  }

  // отправляет инвойс для оплаты
  async sendInvoice(input: SendInvoiceInput): Promise<void> {
    await this.request('sendInvoice', {
      chat_id: input.chatId,
      title: input.title,
      description: input.description,
      payload: input.payload,
      provider_token: input.providerToken,
      currency: input.currency,
      prices: input.prices,
    })
  }

  // редактирует текст существующего сообщения
  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    options: EditMessageOptions = {},
  ): Promise<void> {
    await this.request('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    })
  }

  // подтверждает нажатие inline-кнопки
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.request('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    })
  }

  // отвечает на pre-checkout запрос перед списанием
  async answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    input: { ok: true } | { ok: false; errorMessage: string },
  ): Promise<void> {
    await this.request('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok: input.ok,
      error_message: input.ok ? undefined : input.errorMessage,
    })
  }

  // регистрирует список команд бота
  async setMyCommands(): Promise<void> {
    await this.request('setMyCommands', {
      commands: [
        { command: 'start', description: 'Open the booking menu' },
        { command: 'book', description: 'Book a room or desk' },
        { command: 'slots', description: 'See available slots' },
        { command: 'my_bookings', description: 'See your active bookings' },
        { command: 'calendar', description: 'Connect Google or Outlook calendar' },
        { command: 'help', description: 'Show help' },
      ],
    })
  }

  // выполняет запрос к telegram api и возвращает результат
  private async request<TData = unknown>(method: string, payload: unknown): Promise<TData> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as TelegramApiResponse<TData>

    if (!response.ok || !body.ok) {
      throw new Error(body.description ?? `Telegram API request failed: ${method}`)
    }

    return body.result as TData
  }
}
