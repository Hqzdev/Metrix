import { once } from 'node:events'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookingResponse } from '../../../packages/api/src/contracts/bookings.js'
import { AvailabilityHub, type AvailabilityMessage } from '../../../packages/api/src/realtime/availability-hub.js'
import type { BookingEventPayload } from '../../../packages/api/src/shared/events/booking-events.js'

const booking: BookingResponse = {
  endsAt: '2026-04-30T12:00:00.000Z',
  id: 'booking-1',
  locationId: 'location-1',
  paidAmountMinorUnits: 3200000,
  priceLabel: '32 000 RUB',
  resourceId: 'resource-1',
  startsAt: '2026-04-30T09:00:00.000Z',
  status: 'active',
  telegramUserId: 123,
}

type AvailabilityHubFixture = {
  close: () => Promise<void>
  hub: AvailabilityHub
  server: Server
  url: string
}

async function createAvailabilityHubFixture(): Promise<AvailabilityHubFixture> {
  const server = createServer()
  const hub = AvailabilityHub.create(server)

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const { port } = server.address() as AddressInfo

  return {
    close: async () => {
      hub.close()
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    },
    hub,
    server,
    url: `ws://127.0.0.1:${port}/ws/availability`,
  }
}

async function connectAvailabilityClient(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url)
  await waitForSocketEvent(socket, 'open')
  return socket
}

async function closeAvailabilityClient(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) {
    return
  }

  const closed = waitForSocketEvent(socket, 'close')
  socket.close()
  await closed
}

function readAvailabilityMessage(socket: WebSocket): Promise<AvailabilityMessage> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('error', onError)
    }
    const onMessage = (event: MessageEvent) => {
      cleanup()
      resolve(JSON.parse(String(event.data)) as AvailabilityMessage)
    }
    const onError = (event: Event) => {
      cleanup()
      reject(event)
    }

    socket.addEventListener('message', onMessage, { once: true })
    socket.addEventListener('error', onError, { once: true })
  })
}

function waitForSocketEvent(socket: WebSocket, eventName: 'close' | 'open'): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener(eventName, onEvent)
      socket.removeEventListener('error', onError)
    }
    const onEvent = () => {
      cleanup()
      resolve()
    }
    const onError = (event: Event) => {
      cleanup()
      reject(event)
    }

    socket.addEventListener(eventName, onEvent, { once: true })
    socket.addEventListener('error', onError, { once: true })
  })
}

function createBookingEventPayload(overrides: Partial<BookingResponse> = {}): BookingEventPayload {
  return {
    booking: {
      ...booking,
      ...overrides,
    },
    occurredAt: '2026-04-30T08:55:00.000Z',
  }
}

test('AvailabilityHub acknowledges sanitized subscriptions', async () => {
  const fixture = await createAvailabilityHubFixture()
  const socket = await connectAvailabilityClient(fixture.url)

  try {
    const ack = readAvailabilityMessage(socket)

    socket.send(
      JSON.stringify({
        locationIds: ['location-1', 123],
        resourceIds: ['resource-1', null],
        type: 'subscribe',
      }),
    )

    assert.deepEqual(await ack, {
      locationIds: ['location-1'],
      resourceIds: ['resource-1'],
      type: 'subscribed',
    })
  } finally {
    await closeAvailabilityClient(socket)
    await fixture.close()
  }
})

test('AvailabilityHub broadcasts availability changes to matching subscriptions', async () => {
  const fixture = await createAvailabilityHubFixture()
  const socket = await connectAvailabilityClient(fixture.url)

  try {
    socket.send(
      JSON.stringify({
        locationIds: ['location-1'],
        resourceIds: [],
        type: 'subscribe',
      }),
    )
    await readAvailabilityMessage(socket)

    const update = readAvailabilityMessage(socket)
    fixture.hub.broadcastAvailabilityChanged(createBookingEventPayload())

    assert.deepEqual(await update, {
      bookingId: 'booking-1',
      locationId: 'location-1',
      occurredAt: '2026-04-30T08:55:00.000Z',
      resourceId: 'resource-1',
      status: 'active',
      type: 'availability.changed',
    })
  } finally {
    await closeAvailabilityClient(socket)
    await fixture.close()
  }
})
