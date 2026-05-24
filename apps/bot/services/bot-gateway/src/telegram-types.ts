// Один update от Telegram: сообщение, callback-кнопка или payment query.
export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
  pre_checkout_query?: TelegramPreCheckoutQuery
}

// Обычное Telegram message.
export type TelegramMessage = {
  message_id: number
  chat: { id: number }
  from?: TelegramUser
  successful_payment?: TelegramSuccessfulPayment
  text?: string
}

// Пользователь Telegram.
export type TelegramUser = {
  id: number
  first_name?: string
  username?: string
}

// Нажатие inline-кнопки.
export type TelegramCallbackQuery = {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

// Запрос Telegram перед финальным списанием оплаты.
export type TelegramPreCheckoutQuery = {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

// Сообщение Telegram об успешной оплате.
export type TelegramSuccessfulPayment = {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
  provider_payment_charge_id: string
}

// Одна inline-кнопка Telegram.
export type InlineKeyboardButton = {
  text: string
  callback_data?: string
  url?: string
}

// Telegram inline keyboard: строки кнопок.
export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

// Стандартная форма ответа Telegram Bot API.
export type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}
