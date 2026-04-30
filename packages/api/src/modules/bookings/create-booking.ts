import type { BookingResponse, CreateBookingRequest } from '../../contracts/bookings.js'
import {
  bookingEventNames,
  createBookingEventPayload,
  type BookingEventPublisher,
} from '../../shared/events/booking-events.js'
import { mapBooking } from './booking-mapper.js'
import { BookingRepository } from './booking-repository.js'

type CreateBookingResult =
  | { status: 'ok'; booking: BookingResponse }
  | { status: 'error'; message: string }

// создаёт бронь с проверкой пересечений внутри транзакции
export async function createBooking(
  input: CreateBookingRequest,
  repository: BookingRepository,
  eventPublisher?: BookingEventPublisher,
): Promise<CreateBookingResult> {
  const result: CreateBookingResult = await repository.runSerializable<CreateBookingResult>(async (tx) => {
    const resource = await repository.findResource(input.resourceId, tx)
    if (!resource) {
      return { status: 'error', message: 'resource was not found' }
    }

    const slot = input.slotId ? await repository.findSlot(input.slotId, tx) : null
    const startsAt = slot?.startsAt ?? (input.startsAt ? new Date(input.startsAt) : null)
    const endsAt = slot?.endsAt ?? (input.endsAt ? new Date(input.endsAt) : null)

    if (!startsAt || !endsAt || startsAt >= endsAt) {
      return { status: 'error', message: 'valid booking time is required' }
    }

    const hasOverlap = await repository.hasActiveOverlap(
      {
        endsAt,
        resourceId: resource.id,
        startsAt,
      },
      tx,
    )

    if (hasOverlap) {
      return { status: 'error', message: 'resource is already booked for this time' }
    }

    const booking = await repository.createBooking(
      {
        endsAt,
        locationId: resource.locationId,
        paidAmountMinorUnits: resource.priceMinorUnits,
        priceLabel: resource.priceLabel,
        resourceId: resource.id,
        slotId: slot?.id,
        startsAt,
        status: 'active',
        telegramUserId: input.telegramUserId ? BigInt(input.telegramUserId) : undefined,
        userId: input.userId,
      },
      tx,
    )

    return { status: 'ok', booking: mapBooking(booking) }
  })

  if (result.status === 'ok') {
    await eventPublisher?.emit(bookingEventNames.bookingCreated, createBookingEventPayload(result.booking))
  }

  return result
}
