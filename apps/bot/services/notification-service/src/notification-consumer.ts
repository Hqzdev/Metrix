import type { NotificationSendEvent } from '@metrix/contracts'
import { STREAMS } from '@metrix/contracts'
import type { MetricsRegistry } from '@metrix/observability'
import type { RedisBus } from '@metrix/redis-bus'
import { NotificationValidationError, TelegramApiError, UnsafeFilePathError } from './errors.js'
import type { NotificationServiceLogger } from './logger.js'
import type { TelegramClient } from './telegram-client.js'
import { parseNotificationSendEvent } from './validation.js'

// Consumer group фиксирует, какая группа читает stream уведомлений.
const CONSUMER_GROUP = 'notification-service'
// Как часто измеряем lag Redis stream.
const LAG_COLLECTION_INTERVAL_MS = 30_000
// Как часто RedisBus будет возвращаться к pending messages.
const PENDING_RETRY_INTERVAL_MS = 60_000

// Зависимости notification consumer-а.
type NotificationConsumerDependencies = {
  bus: RedisBus
  logger: NotificationServiceLogger
  metrics?: MetricsRegistry
  telegram: TelegramClient
}

/**
 * Подписывается на stream отправки уведомлений и передаёт события в Telegram.
 */
export async function startNotificationConsumer(deps: NotificationConsumerDependencies): Promise<void> {
  // Подписываемся на общий stream отправки уведомлений.
  await deps.bus.consume<unknown>(
    STREAMS.NOTIFICATION_SEND,
    CONSUMER_GROUP,
    'notifier',
    async (rawEvent) => {
      const event = parseRawNotificationEvent(rawEvent, deps.logger)
      if (!event) return

      await handleNotificationEvent(event, deps)
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      // Lag помогает видеть, отстаёт ли consumer уведомлений.
      onLag: (lag) => {
        deps.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.NOTIFICATION_SEND,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )
}

/**
 * Валидирует raw Redis payload и логирует poison event без бесконечного retry.
 */
function parseRawNotificationEvent(
  rawEvent: unknown,
  logger: NotificationServiceLogger,
): NotificationSendEvent | undefined {
  try {
    return parseNotificationSendEvent(rawEvent)
  } catch (error) {
    if (error instanceof NotificationValidationError) {
      logger.error({
        message: error.message,
        service: 'notification-service',
        action: 'notification.event.rejected',
      })
      return undefined
    }

    throw error
  }
}

/**
 * Обрабатывает одно событие notification stream с typed error handling.
 */
async function handleNotificationEvent(event: NotificationSendEvent, deps: NotificationConsumerDependencies): Promise<void> {
  try {
    // dispatch выбирает конкретный Telegram API метод.
    await dispatch(event, deps.telegram)
  } catch (error) {
    await handleNotificationError(error, event, deps)
  }
}

/**
 * Направляет событие в нужный метод Telegram API.
 */
async function dispatch(event: NotificationSendEvent, telegram: TelegramClient): Promise<void> {
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
      amount: event.amount,
      chatId: event.chatId,
      currency: event.currency,
      description: event.description,
      payload: event.payload,
      providerToken: event.providerToken,
      title: event.title,
    })
    return
  }

  // Отправка готового файла, например отчёта.
  if (event.type === 'send_document') {
    await telegram.sendDocument(event.chatId, event.filePath, event.caption)
    return
  }

  assertNever(event)
}

/**
 * Обрабатывает ожидаемые ошибки доставки, а неожиданные отдаёт Redis consumer-у для retry.
 */
async function handleNotificationError(
  error: unknown,
  event: NotificationSendEvent,
  deps: NotificationConsumerDependencies,
): Promise<void> {
  // Ошибки validation/path traversal логируются и считаются обработанными, чтобы poison event не крутился бесконечно.
  if (error instanceof NotificationValidationError || error instanceof UnsafeFilePathError) {
    deps.logger.error({
      message: error.message,
      service: 'notification-service',
      action: `notification.${event.type}.rejected`,
    })
    return
  }

  // Telegram API вернул ошибку с понятным HTTP status и body.
  if (error instanceof TelegramApiError) {
    await handleTelegramApiError(error, event, deps)
    return
  }

  // Неожиданные ошибки (сеть, файловая система) логируются и перебрасываются,
  // чтобы consumer framework мог принять решение о retry.
  deps.logger.error({ message: 'Unexpected notification error', service: 'notification-service', error })
  throw error
}

/**
 * Логирует Telegram API errors и отдельно обрабатывает неверный payment provider token.
 */
async function handleTelegramApiError(
  error: TelegramApiError,
  event: NotificationSendEvent,
  deps: NotificationConsumerDependencies,
): Promise<void> {
  // Частая ошибка настройки платежей: вместо provider token указан API key.
  if (event.type === 'send_invoice' && error.body.includes('PAYMENT_PROVIDER_INVALID')) {
    await deps.telegram.sendMessage(
      event.chatId,
      'Payment provider token is invalid. Use a Telegram provider token from BotFather Payments, not a YooKassa API key.',
    )
    deps.logger.warn({
      message: 'Telegram payment provider is not configured correctly',
      service: 'notification-service',
      action: 'telegram.sendInvoice.provider_invalid',
      statusCode: error.statusCode,
    })
    return
  }

  // Остальные ошибки Telegram логируем и считаем обработанными.
  deps.logger.error({
    message: error.message,
    service: 'notification-service',
    action: `telegram.${error.method}.failed`,
    statusCode: error.statusCode,
    telegramBody: error.body,
  })
}

/**
 * Защищает dispatch от незамеченного расширения union-типа.
 */
function assertNever(value: never): never {
  throw new NotificationValidationError(`Unsupported notification event: ${JSON.stringify(value)}`)
}
 