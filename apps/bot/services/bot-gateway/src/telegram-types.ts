export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
  pre_checkout_query?: TelegramPreCheckoutQuery
}

export type TelegramMessage = {
  message_id: number
  chat: { id: number }
  from?: TelegramUser
  successful_payment?: TelegramSuccessfulPayment
  text?: string
}

export type TelegramUser = {
  id: number
  first_name?: string
  username?: string
}

export type TelegramCallbackQuery = {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export type TelegramPreCheckoutQuery = {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

export type TelegramSuccessfulPayment = {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
  provider_payment_charge_id: string
}

export type InlineKeyboardButton = {
  text: string
  callback_data?: string
  url?: string
}

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

export type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}
