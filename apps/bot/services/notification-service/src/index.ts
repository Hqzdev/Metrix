import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required')

const BASE = `https://api.telegram.org/bot${TOKEN}`
const bus = new RedisBus(process.env.REDIS_URL ?? 'redis://localhost:6379')

await bus.connect()

type SendEvent =
  | { type: 'send_message'; chatId: number; text: string; replyMarkup?: unknown }
  | { type: 'edit_message'; chatId: number; messageId: number; text: string; replyMarkup?: unknown }
  | { type: 'send_invoice'; chatId: number; invoiceId: string; title: string; description: string; payload: string; providerToken: string; currency: string; amount: number }
  | { type: 'send_document'; chatId: number; filePath: string; caption?: string }

await bus.consume<SendEvent>(STREAMS.NOTIFICATION_SEND, 'notification-service', 'notifier', async (event) => {
  if (event.type === 'send_message') {
    await tgCall('sendMessage', {
      chat_id: event.chatId,
      text: event.text,
      reply_markup: event.replyMarkup,
    })
    return
  }

  if (event.type === 'edit_message') {
    await tgCall('editMessageText', {
      chat_id: event.chatId,
      message_id: event.messageId,
      text: event.text,
      reply_markup: event.replyMarkup,
    })
    return
  }

  if (event.type === 'send_invoice') {
    await tgCall('sendInvoice', {
      chat_id: event.chatId,
      title: event.title,
      description: event.description,
      payload: event.payload,
      provider_token: event.providerToken,
      currency: event.currency,
      prices: [{ label: event.title, amount: event.amount }],
    })
    return
  }
})

console.log('notification-service started, consuming stream:', STREAMS.NOTIFICATION_SEND)

async function tgCall(method: string, payload: unknown): Promise<void> {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Telegram ${method} failed`, { body })
  }
}
