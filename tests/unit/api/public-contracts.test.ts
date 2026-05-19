import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { STREAMS, type PaymentCompletedEvent } from '../../../apps/bot/packages/contracts/src/index.js'
import type {
  AdminStatsResponse,
  BookingResponse,
  CancelBookingRequest,
  CreateBookingRequest,
  ListBookingsQuery,
  ReportExportRequest,
  ResourceUtilizationResponse,
  RescheduleBookingRequest,
} from '../../../packages/api/src/contracts/index.js'

const booking = {
  endsAt: '2026-04-30T12:00:00.000Z',
  id: 'booking-1',
  locationId: 'location-1',
  paidAmountMinorUnits: 3200000,
  priceLabel: '32 000 RUB',
  resourceId: 'resource-1',
  slotId: 'slot-1',
  startsAt: '2026-04-30T09:00:00.000Z',
  status: 'active',
  telegramUserId: 123,
} satisfies BookingResponse

const createBooking = {
  resourceId: 'resource-1',
  slotId: 'slot-1',
  telegramUserId: 123,
} satisfies CreateBookingRequest

const cancelBooking = {
  bookingId: 'booking-1',
  telegramUserId: 123,
} satisfies CancelBookingRequest

const rescheduleBooking = {
  bookingId: 'booking-1',
  newSlotId: 'slot-2',
  telegramUserId: 123,
} satisfies RescheduleBookingRequest

const listBookings = {
  resourceId: 'resource-1',
  status: 'active',
  telegramUserId: 123,
} satisfies ListBookingsQuery

const adminStats = {
  active: 1,
  cancelled: 0,
  completed: 0,
  rescheduled: 0,
  revenueMinorUnits: 3200000,
  total: 1,
} satisfies AdminStatsResponse

const utilization = {
  resourceId: 'resource-1',
  resourceName: 'Meeting room',
  utilizationPercent: 75,
} satisfies ResourceUtilizationResponse

const reportExport = {
  dateFrom: '2026-04-01',
  dateTo: '2026-04-30',
  format: 'pdf',
} satisfies ReportExportRequest

const paymentCompleted = {
  chatId: 123,
  invoiceId: 'invoice-1',
  resourceId: 'resource-1',
  slotId: 'slot-1',
  telegramUserId: 123,
  totalAmountMinorUnits: 3200000,
} satisfies PaymentCompletedEvent

test('public TypeScript contracts keep expected client shapes', () => {
  assert.equal(booking.status, 'active')
  assert.equal(createBooking.resourceId, 'resource-1')
  assert.equal(cancelBooking.bookingId, 'booking-1')
  assert.equal(rescheduleBooking.newSlotId, 'slot-2')
  assert.equal(listBookings.status, 'active')
  assert.equal(adminStats.total, 1)
  assert.equal(utilization.utilizationPercent, 75)
  assert.equal(reportExport.format, 'pdf')
  assert.equal(paymentCompleted.invoiceId, 'invoice-1')
  assert.equal(STREAMS.PAYMENT_COMPLETED, 'stream:payment.completed')
})

test('OpenAPI spec exposes public contract schemas and paths', async () => {
  const source = await readFile('docs/openapi/metrix-bot-api.yaml', 'utf8')

  for (const marker of [
    '/bookings:',
    '/bookings/{bookingId}:',
    '/locations:',
    '/resources:',
    '/stats:',
    '/reports:',
    'Booking:',
    'CreateBookingInput:',
    'ErrorResponse:',
  ]) {
    assert.ok(source.includes(marker), `missing OpenAPI marker: ${marker}`)
  }
})
