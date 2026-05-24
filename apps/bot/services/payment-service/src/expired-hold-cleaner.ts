import type { PrismaClient } from '@prisma/client'
import type { PaymentServiceLogger } from './logger.js'

// Как часто проверяем истёкшие holds.
const CLEANUP_INTERVAL_MS = 60_000

/**
 * Запускает периодическую очистку истёкших SlotHold.
 *
 * Cleaner не удаляет записи.
 * Он переводит held holds в expired, чтобы audit и разбор инцидентов
 * сохраняли историю payment flow.
 */
export function startExpiredHoldCleaner(prisma: PrismaClient, logger: PaymentServiceLogger): NodeJS.Timeout {
  // setInterval регулярно запускает expireHolds.
  const timer = setInterval(() => {
    void expireHolds(prisma, logger)
  }, CLEANUP_INTERVAL_MS)

  // unref не удерживает Node.js процесс только ради таймера.
  timer.unref()
  // Первый проход делаем сразу при старте.
  void expireHolds(prisma, logger)

  return timer
}

/**
 * Помечает устаревшие holds как expired.
 */
async function expireHolds(prisma: PrismaClient, logger: PaymentServiceLogger): Promise<void> {
  try {
    // Обновляем только holds в статусе held, срок которых уже прошёл.
    const result = await prisma.slotHold.updateMany({
      data: { status: 'expired' },
      where: {
        expiresAt: { lt: new Date() },
        status: 'held',
      },
    })

    // Логируем только если реально что-то изменили.
    if (result.count > 0) {
      logger.info({
        action: 'slot_hold.expired',
        count: result.count,
        message: 'Expired stale slot holds',
        service: 'payment-service',
      })
    }
  } catch (error) {
    // Ошибка cleaner-а не должна ронять payment-service.
    logger.error({
      action: 'slot_hold.expire.failed',
      error,
      message: 'Failed to expire stale slot holds',
      service: 'payment-service',
    })
  }
}
