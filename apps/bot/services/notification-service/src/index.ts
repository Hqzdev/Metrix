import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { installGracefulShutdown } from '@metrix/observability'
import { readNotificationServiceConfig, REPORTS_DIR } from './config.js'
import { NotificationServiceLogger } from './logger.js'
import { TelegramClient } from './telegram-client.js'
import { TelegramApiError, UnsafeFilePathError } from './errors.js'

const logger = new NotificationServiceLogger()
const config = readNotificationServiceConfig(process.env)
const CONSUMER_GROUP = 'notification-service'
const PENDING_RETRY_INTERVAL_MS = 60_000

const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
await bus.connect()

installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await bus.disconnect()
    },
  ],
  service: 'notification-service',
})

const telegram = new TelegramClient({
  baseUrl: config.telegramBaseUrl,
  logger,
  reportsDir: REPORTS_DIR,
})

type SendEvent =
  | { type: 'send_message'; chatId: number; text: string; replyMarkup?: unknown }
  | { type: 'edit_message'; chatId: number; messageId: number; text: string; replyMarkup?: unknown }
  | { type: 'send_invoice'; chatId: number; invoiceId: string; title: string; description: string; payload: string; providerToken: string; currency: string; amount: number }
  | { type: 'send_document'; chatId: number; filePath: string; caption?: string }

await bus.consume<SendEvent>(
  STREAMS.NOTIFICATION_SEND,
  CONSUMER_GROUP,
  'notifier',
  async (event) => {
    try {
      await dispatch(event)
    } catch (error) {
      // ошибки Telegram API и path traversal логируются — consumer не падает,
      // чтобы не блокировать обработку последующих событий в очереди
      if (error instanceof UnsafeFilePathError) {
        logger.error({ message: error.message, service: 'notification-service', action: 'send_document.rejected' })
        return
      }

      if (error instanceof TelegramApiError) {
        logger.error({
          message: error.message,
          service: 'notification-service',
          action: `telegram.${error.method}.failed`,
          statusCode: error.statusCode,
          telegramBody: error.body,
        })
        return
      }

      // неожиданные ошибки (сеть, файловая система) логируются и перебрасываются
      // чтобы consumer framework мог принять решение о retry
      logger.error({ message: 'Unexpected notification error', service: 'notification-service', error })
      throw error
    }
  },
  {
    retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
  },
)

/**
 * Направляет событие или HTTP-контекст в нужный обработчик.
 */
async function dispatch(event: SendEvent): Promise<void> {
  if (event.type === 'send_message') {
    await telegram.sendMessage(event.chatId, event.text, event.replyMarkup)
    return
  }

  if (event.type === 'edit_message') {
    await telegram.editMessage(event.chatId, event.messageId, event.text, event.replyMarkup)
    return
  }

  if (event.type === 'send_invoice') {
    await telegram.sendInvoice({
      chatId: event.chatId,
      title: event.title,
      description: event.description,
      payload: event.payload,
      providerToken: event.providerToken,
      currency: event.currency,
      amount: event.amount,
    })
    return
  }

  if (event.type === 'send_document') {
    await telegram.sendDocument(event.chatId, event.filePath, event.caption)
    return
  }
}

logger.info({
  message: `notification-service started, consuming stream: ${STREAMS.NOTIFICATION_SEND}`,
  service: 'notification-service',
})
