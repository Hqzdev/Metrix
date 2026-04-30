import type { PrismaClient } from '@prisma/client'
import type { DbBooking } from './booking-mapper.js'

type DbResource = {
  id: string
  locationId: string
  priceLabel: string
  priceMinorUnits: number
}

type DbSlot = {
  id: string
  endsAt: Date
  startsAt: Date
}

type CreateBookingData = {
  endsAt: Date
  locationId: string
  paidAmountMinorUnits: number
  priceLabel: string
  resourceId: string
  slotId?: string
  startsAt: Date
  status: 'active'
  telegramUserId?: bigint
  userId?: string
}

export type BookingTransaction = {
  booking: {
    create(input: { data: CreateBookingData }): Promise<DbBooking>
    findFirst(input: {
      select: { id: true }
      where: {
        endsAt: { gt: Date }
        resourceId: string
        startsAt: { lt: Date }
        status: 'active'
      }
    }): Promise<{ id: string } | null>
  }
  resource: {
    findUnique(input: { where: { id: string } }): Promise<DbResource | null>
  }
  slot: {
    findUnique(input: { where: { id: string } }): Promise<DbSlot | null>
  }
}

// репозиторий бронирований поверх prisma
export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async runSerializable<TData>(callback: (tx: BookingTransaction) => Promise<TData>): Promise<TData> {
    return this.prisma.$transaction((tx: unknown) => callback(tx as BookingTransaction), {
      isolationLevel: 'Serializable',
    })
  }

  async findResource(resourceId: string, tx: BookingTransaction): Promise<DbResource | null> {
    return tx.resource.findUnique({
      where: { id: resourceId },
    })
  }

  async findSlot(slotId: string, tx: BookingTransaction): Promise<DbSlot | null> {
    return tx.slot.findUnique({
      where: { id: slotId },
    })
  }

  async hasActiveOverlap(input: { endsAt: Date; resourceId: string; startsAt: Date }, tx: BookingTransaction): Promise<boolean> {
    const booking = await tx.booking.findFirst({
      where: {
        resourceId: input.resourceId,
        status: 'active',
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      },
      select: { id: true },
    })

    return Boolean(booking)
  }

  async createBooking(input: CreateBookingData, tx: BookingTransaction): Promise<DbBooking> {
    return tx.booking.create({
      data: input,
    })
  }
}
