export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
  pre_checkout_query?: TelegramPreCheckoutQuery
}

export type TelegramUser = {
  id: number
  first_name?: string
  username?: string
}

export type TelegramChat = {
  id: number
}

export type TelegramMessage = {
  message_id: number
  chat: TelegramChat
  from?: TelegramUser
  successful_payment?: TelegramSuccessfulPayment
  text?: string
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
  callback_data?: string
  text: string
  url?: string
}

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

export type SendMessageOptions = {
  reply_markup?: InlineKeyboardMarkup
  parse_mode?: 'HTML'
}

export type LabeledPrice = {
  label: string
  amount: number
}

export type SendInvoiceInput = {
  chatId: number
  title: string
  description: string
  payload: string
  providerToken: string
  currency: string
  prices: LabeledPrice[]
}

export type EditMessageOptions = {
  reply_markup?: InlineKeyboardMarkup
  parse_mode?: 'HTML'
}

export type TelegramApiResponse<TData> = {
  ok: boolean
  result?: TData
  description?: string
}
