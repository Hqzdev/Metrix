import type { Prisma } from '@prisma/client'

type PaymentSagaTransaction = Prisma.TransactionClient
type ReleasedHoldStatus = 'cancelled' | 'paid'

/**
 * Releases a held slot as part of an invoice saga transition.
 */
export async function releaseHeldSlot(
  tx: PaymentSagaTransaction,
  invoiceId: string,
  status: ReleasedHoldStatus,
): Promise<void> {
  await tx.slotHold.updateMany({
    data: { status },
    where: { invoiceId, status: 'held' },
  })
}

/**
 * Marks the saga as fully completed after booking-service confirms a booking.
 */
export async function markSagaBookingCompleted(
  tx: PaymentSagaTransaction,
  invoiceId: string,
  bookingId: string,
): Promise<void> {
  await releaseHeldSlot(tx, invoiceId, 'paid')
  await tx.paymentSaga.updateMany({
    data: { bookingId, status: 'completed' },
    where: { invoiceId },
  })
}

/**
 * Moves a paid saga into manual recovery after booking creation fails.
 */
export async function markSagaBookingFailed(
  tx: PaymentSagaTransaction,
  invoiceId: string,
  failureReason: string,
): Promise<void> {
  await tx.paymentSaga.updateMany({
    data: {
      failureReason,
      status: 'failed',
    },
    where: { invoiceId },
  })
}

/**
 * Records a completed payment before booking-service creates the booking.
 */
export async function markSagaAwaitingBooking(
  tx: PaymentSagaTransaction,
  invoiceId: string,
  paidAmount: number,
): Promise<void> {
  await tx.paymentSaga.updateMany({
    data: { paidAmount, status: 'awaiting_booking' },
    where: { invoiceId },
  })
}

/**
 * Starts manual compensation and releases the held slot.
 */
export async function startSagaCompensation(
  tx: PaymentSagaTransaction,
  invoiceId: string,
): Promise<void> {
  await tx.paymentSaga.update({
    data: { status: 'compensating' },
    where: { invoiceId },
  })
  await releaseHeldSlot(tx, invoiceId, 'cancelled')
  await tx.pendingInvoice.updateMany({
    data: { status: 'failed' },
    where: { id: invoiceId },
  })
}
