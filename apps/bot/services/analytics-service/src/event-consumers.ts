import { STREAMS, type BookingCancelledEvent, type BookingCompletedEvent, type BookingCreatedEvent } from '@metrix/contracts'
import type { MetricsRegistry } from '@metrix/observability'
import type { RedisBus } from '@metrix/redis-bus'
import type { AnalyticsServiceLogger } from './logger.js'

// Consumer group позволяет нескольким воркерам делить обработку stream-а.
const CONSUMER_GROUP = 'analytics-service'
// Как часто измерять lag по Redis stream.
const LAG_COLLECTION_INTERVAL_MS = 30_000
// Как часто пытаться забрать pending messages после падений.
const PENDING_RETRY_INTERVAL_MS = 60_000

// Опции consumers: сейчас сюда передаём метрики.
type AnalyticsEventConsumerOptions = {
  metrics?: MetricsRegistry
}

/**
 * Регистрирует Redis stream consumers для событий, влияющих на аналитику.
 *
 * Сейчас обработчики только логируют факт события. Это явная точка расширения
 * для будущей инвалидации cache или предагрегации метрик.
 */
export async function registerAnalyticsEventConsumers(
  bus: RedisBus,
  logger: AnalyticsServiceLogger,
  options: AnalyticsEventConsumerOptions = {},
): Promise<void> {
  // Слушаем создание бронирования.
  await bus.consume<BookingCreatedEvent>(
    STREAMS.BOOKING_CREATED,
    CONSUMER_GROUP,
    'analytics-created-worker',
    async () => {
      // Пока событие только логируется; позже здесь можно обновлять агрегаты/cache.
      logger.info({
        action: 'booking.created',
        message: 'Analytics event received',
        service: 'analytics-service',
      })
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      // Lag пишем в метрики, чтобы видеть отставание consumer-а.
      onLag: (lag) => {
        options.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.BOOKING_CREATED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )

  // Слушаем отмену бронирования.
  await bus.consume<BookingCancelledEvent>(
    STREAMS.BOOKING_CANCELLED,
    CONSUMER_GROUP,
    'analytics-cancelled-worker',
    async () => {
      // Сейчас это точка расширения для будущей аналитики отмен.
      logger.info({
        action: 'booking.cancelled',
        message: 'Analytics event received',
        service: 'analytics-service',
      })
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      // Отдельная метрика lag по stream-у отмен.
      onLag: (lag) => {
        options.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.BOOKING_CANCELLED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )

  // Слушаем автоматическое завершение бронирования.
  // Без этого consumer-а события BOOKING_COMPLETED будут копиться в Redis без ACK.
  await bus.consume<BookingCompletedEvent>(
    STREAMS.BOOKING_COMPLETED,
    CONSUMER_GROUP,
    'analytics-completed-worker',
    async () => {
      // Точка расширения: здесь можно инвалидировать cache или обновлять агрегаты.
      logger.info({
        action: 'booking.completed',
        message: 'Analytics event received',
        service: 'analytics-service',
      })
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      onLag: (lag) => {
        options.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.BOOKING_COMPLETED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )
}
