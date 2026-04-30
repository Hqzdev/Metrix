import type { Server } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import type { BookingEventPayload } from '../shared/events/booking-events.js'

type AvailabilityClientState = {
  locationIds: Set<string>
  resourceIds: Set<string>
}

export type AvailabilityMessage =
  | {
      type: 'availability.changed'
      bookingId: string
      locationId: string
      resourceId: string
      status: string
      occurredAt: string
    }
  | {
      type: 'subscribed'
      locationIds: string[]
      resourceIds: string[]
    }

type ClientSubscribeMessage = {
  type?: string
  locationIds?: unknown
  resourceIds?: unknown
}

// websocket hub для обновления доступности в реальном времени
export class AvailabilityHub {
  private readonly clients = new Map<WebSocket, AvailabilityClientState>()

  constructor(private readonly server: WebSocketServer) {
    this.server.on('connection', (socket) => this.handleConnection(socket))
  }

  static create(server: Server, path = '/ws/availability'): AvailabilityHub {
    return new AvailabilityHub(new WebSocketServer({ path, server }))
  }

  broadcastAvailabilityChanged(payload: BookingEventPayload): void {
    const message: AvailabilityMessage = {
      type: 'availability.changed',
      bookingId: payload.booking.id,
      locationId: payload.booking.locationId,
      occurredAt: payload.occurredAt,
      resourceId: payload.booking.resourceId,
      status: payload.booking.status,
    }

    for (const [socket, state] of this.clients.entries()) {
      if (socket.readyState !== WebSocket.OPEN || !this.shouldNotify(state, message)) {
        continue
      }

      socket.send(JSON.stringify(message))
    }
  }

  close(): void {
    this.server.close()
  }

  private handleConnection(socket: WebSocket): void {
    const state: AvailabilityClientState = {
      locationIds: new Set(),
      resourceIds: new Set(),
    }

    this.clients.set(socket, state)
    socket.on('message', (rawMessage) => this.handleMessage(socket, rawMessage.toString()))
    socket.on('close', () => {
      this.clients.delete(socket)
    })
  }

  private handleMessage(socket: WebSocket, rawMessage: string): void {
    const message = this.parseSubscribeMessage(rawMessage)
    if (!message || message.type !== 'subscribe') {
      return
    }

    const state = this.clients.get(socket)
    if (!state) {
      return
    }

    state.locationIds = new Set(message.locationIds)
    state.resourceIds = new Set(message.resourceIds)

    const response: AvailabilityMessage = {
      type: 'subscribed',
      locationIds: [...state.locationIds],
      resourceIds: [...state.resourceIds],
    }

    socket.send(JSON.stringify(response))
  }

  private parseSubscribeMessage(rawMessage: string): { type: 'subscribe'; locationIds: string[]; resourceIds: string[] } | null {
    try {
      const message = JSON.parse(rawMessage) as ClientSubscribeMessage
      if (message.type !== 'subscribe') {
        return null
      }

      const locationIds = Array.isArray(message.locationIds) ? message.locationIds.filter((id) => typeof id === 'string') : []
      const resourceIds = Array.isArray(message.resourceIds) ? message.resourceIds.filter((id) => typeof id === 'string') : []

      return {
        locationIds,
        resourceIds,
        type: 'subscribe',
      }
    } catch {
      return null
    }
  }

  private shouldNotify(state: AvailabilityClientState, message: AvailabilityMessage): boolean {
    if (message.type !== 'availability.changed') {
      return false
    }

    if (state.locationIds.size === 0 && state.resourceIds.size === 0) {
      return true
    }

    return state.locationIds.has(message.locationId) || state.resourceIds.has(message.resourceId)
  }
}
