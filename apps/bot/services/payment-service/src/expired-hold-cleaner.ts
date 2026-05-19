import type { PrismaClient } from '@prisma/client'
import type { PaymentServiceLogger } from './logger.js'

const CLEANUP_INTERVAL_MS = 60_000

/**
 * Запускает периодическую очистку истёкших SlotHold.
 *
 * Cleaner не удаляет записи.
 * Он переводит held holds в expired, чтобы audit и разбор инцидентов
 * сохраняли историю payment flow.
 */
export function startExpiredHoldCleaner(prisma: PrismaClient, logger: PaymentServiceLogger): NodeJS.Timeout {
  const timer = setInterval(() => {
    void expireHolds(prisma, logger)
  }, CLEANUP_INTERVAL_MS)

  timer.unref()
  void expireHolds(prisma, logger)

  return timer
}

async function expireHolds(prisma: PrismaClient, logger: PaymentServiceLogger): Promise<void> {
  try {
    const result = await prisma.slotHold.updateMany({
      data: { status: 'expired' },
      where: {
        expiresAt: { lt: new Date() },
        status: 'held',
      },
    })

    if (result.count > 0) {
      logger.info({
        action: 'slot_hold.expired',
        count: result.count,
        message: 'Expired stale slot holds',
        service: 'payment-service',
      })
    }
  } catch (error) {
    logger.error({
      action: 'slot_hold.expire.failed',
      error,
      message: 'Failed to expire stale slot holds',
      service: 'payment-service',
    })
  }
}
