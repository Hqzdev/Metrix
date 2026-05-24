import { RedisBus } from '@metrix/redis-bus'
import { STREAMS } from '@metrix/contracts'
import { installGracefulShutdown } from '@metrix/observability'
import { readNotificationServiceConfig, REPORTS_DIR } from './config.js'
import { NotificationServiceLogger } from './logger.js'
import { TelegramClient } from './telegram-client.js'
import { TelegramApiError, UnsafeFilePathError } from './errors.js'

// Логгер создаём первым, чтобы видеть события старта и ошибки.
const logger = new NotificationServiceLogger()
// Конфиг содержит Redis URL и Telegram Bot API URL.
const config = readNotificationServiceConfig(process.env)
// Consumer group фиксирует, какая группа читает stream уведомлений.
const CONSUMER_GROUP = 'notification-service'
// Как часто RedisBus будет возвращаться к pending messages.
const PENDING_RETRY_INTERVAL_MS = 60_000

// RedisBus слушает события, которые нужно отправить пользователю.
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
// До регистрации consumer-а подключаемся к Redis.
await bus.connect()

// При остановке процесса аккуратно закрываем Redis.
installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await bus.disconnect()
    },
  ],
  service: 'notification-service',
})

// TelegramClient инкапсулирует все вызовы Telegram Bot API.
const telegram = new TelegramClient({
  baseUrl: config.telegramBaseUrl,
  logger,
  reportsDir: REPORTS_DIR,
})

// Все типы уведомлений, которые может прислать другой сервис через Redis stream.
type SendEvent =
  // Отправить новое текстовое сообщение.
  | { type: 'send_message'; chatId: number; text: string; replyMarkup?: unknown }
  // Отредактировать уже отправленное сообщение.
  | { type: 'edit_message'; chatId: number; messageId: number; text: string; replyMarkup?: unknown }
  // Отправить Telegram invoice для оплаты.
  | { type: 'send_invoice'; chatId: number; invoiceId: string; title: string; description: string; payload: string; providerToken: string; currency: string; amount: number }
  // Отправить файл из разрешённой директории отчётов.
  | { type: 'send_document'; chatId: number; filePath: string; caption?: string }

// Подписываемся на общий stream отправки уведомлений.
await bus.consume<SendEvent>(
  STREAMS.NOTIFICATION_SEND,
  CONSUMER_GROUP,
  'notifier',
  async (event) => {
    try {
      // dispatch выбирает конкретный Telegram API метод.
      await dispatch(event)
    } catch (error) {
      // Ошибки Telegram API и path traversal логируются — consumer не падает,
      // чтобы не блокировать обработку последующих событий в очереди.
      if (error instanceof UnsafeFilePathError) {
        logger.error({ message: error.message, service: 'notification-service', action: 'send_document.rejected' })
        return
      }

      // Telegram API вернул ошибку с понятным HTTP status и body.
      if (error instanceof TelegramApiError) {
        // Частая ошибка настройки платежей: вместо provider token указан API key.
        if (event.type === 'send_invoice' && error.body.includes('PAYMENT_PROVIDER_INVALID')) {
          await telegram.sendMessage(
            event.chatId,
            'Payment provider token is invalid. Use a Telegram provider token from BotFather Payments, not a YooKassa API key.',
          )
          logger.warn({
            message: 'Telegram payment provider is not configured correctly',
            service: 'notification-service',
            action: 'telegram.sendInvoice.provider_invalid',
            statusCode: error.statusCode,
          })
          return
        }

        // Остальные ошибки Telegram логируем и считаем обработанными.
        logger.error({
          message: error.message,
          service: 'notification-service',
          action: `telegram.${error.method}.failed`,
          statusCode: error.statusCode,
          telegramBody: error.body,
        })
        return
      }

      // Неожиданные ошибки (сеть, файловая система) логируются и перебрасываются,
      // чтобы consumer framework мог принять решение о retry.
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
  // Обычное текстовое сообщение.
  if (event.type === 'send_message') {
    await telegram.sendMessage(event.chatId, event.text, event.replyMarkup)
    return
  }

  // Редактирование существующего сообщения.
  if (event.type === 'edit_message') {
    await telegram.editMessage(event.chatId, event.messageId, event.text, event.replyMarkup)
    return
  }

  // Telegram invoice для оплаты.
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

  // Отправка готового файла, например отчёта.
  if (event.type === 'send_document') {
    await telegram.sendDocument(event.chatId, event.filePath, event.caption)
    return
  }
}

// Финальный лог показывает, что consumer успешно стартовал.
logger.info({
  message: `notification-service started, consuming stream: ${STREAMS.NOTIFICATION_SEND}`,
  service: 'notification-service',
})
