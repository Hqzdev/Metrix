import { STREAMS, type BookingCancelledEvent, type BookingCreatedEvent } from '@metrix/contracts'
import type { MetricsRegistry } from '@metrix/observability'
import type { RedisBus } from '@metrix/redis-bus'
import type { AnalyticsServiceLogger } from './logger.js'

const CONSUMER_GROUP = 'analytics-service'
const LAG_COLLECTION_INTERVAL_MS = 30_000
const PENDING_RETRY_INTERVAL_MS = 60_000

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
  await bus.consume<BookingCreatedEvent>(
    STREAMS.BOOKING_CREATED,
    CONSUMER_GROUP,
    'analytics-created-worker',
    async () => {
      logger.info({
        action: 'booking.created',
        message: 'Analytics event received',
        service: 'analytics-service',
      })
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      onLag: (lag) => {
        options.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.BOOKING_CREATED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )

  await bus.consume<BookingCancelledEvent>(
    STREAMS.BOOKING_CANCELLED,
    CONSUMER_GROUP,
    'analytics-cancelled-worker',
    async () => {
      logger.info({
        action: 'booking.cancelled',
        message: 'Analytics event received',
        service: 'analytics-service',
      })
    },
    {
      collectLagIntervalMs: LAG_COLLECTION_INTERVAL_MS,
      onLag: (lag) => {
        options.metrics?.setGauge('metrix_redis_stream_lag', lag, {
          group: CONSUMER_GROUP,
          stream: STREAMS.BOOKING_CANCELLED,
        })
      },
      retryPendingIntervalMs: PENDING_RETRY_INTERVAL_MS,
    },
  )
}
