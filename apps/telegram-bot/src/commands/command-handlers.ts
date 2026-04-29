import { mainMenuKeyboard } from '../bot/keyboards.js'
import { helpMessage, welcomeMessage } from '../bot/messages.js'
import type { TelegramClient } from '../lib/telegram-client.js'
import type { TelegramMessage } from '../lib/telegram-types.js'

// обрабатывает команду /start и отправляет главное меню
export async function handleStartCommand(input: {
  message: TelegramMessage
  telegram: TelegramClient
}): Promise<void> {
  await input.telegram.sendMessage(input.message.chat.id, welcomeMessage(input.message.from?.first_name), {
    reply_markup: mainMenuKeyboard(),
  })
}

// обрабатывает команду /help и отправляет список команд
export async function handleHelpCommand(input: {
  message: TelegramMessage
  telegram: TelegramClient
}): Promise<void> {
  await input.telegram.sendMessage(input.message.chat.id, helpMessage(), {
    reply_markup: mainMenuKeyboard(),
  })
}
