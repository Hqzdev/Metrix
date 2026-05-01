import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '@metrix/contracts'
import type { InlineKeyboardMarkup } from './telegram-types.js'

export function mainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Book now', callback_data: 'menu:book' }],
      [{ text: 'Available slots', callback_data: 'menu:slots' }],
      [{ text: 'My bookings', callback_data: 'menu:bookings' }],
      [{ text: 'Help', callback_data: 'menu:help' }],
    ],
  }
}

export function locationKeyboard(locations: BookingLocation[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...locations.map((l) => [{ text: `${l.name} · ${l.occupancy}`, callback_data: `location:${l.id}` }]),
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

export function resourceKeyboard(resources: BookingResource[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...resources.map((r) => [{ text: `${r.name} · ${r.priceLabel}`, callback_data: `resource:${r.locationId}:${r.id}` }]),
      [{ text: 'Back to locations', callback_data: 'menu:book' }],
    ],
  }
}

export function slotsKeyboard(resource: BookingResource, slots: AvailableSlot[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...slots.map((s) => [{ text: `${s.startsAt} - ${s.endsAt}`, callback_data: `slot:${resource.id}:${s.id}` }]),
      [{ text: 'Back to offices', callback_data: `location:${resource.locationId}` }],
    ],
  }
}

export function confirmBookingKeyboard(resource: BookingResource, slotId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Pay 100% and book', callback_data: `confirm:${resource.id}:${slotId}` }],
      [{ text: 'Choose another slot', callback_data: `resource:${resource.locationId}:${resource.id}` }],
    ],
  }
}

export function bookingsKeyboard(bookings: Booking[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...bookings.map((b) => [{ text: `Cancel: ${b.resourceName}`, callback_data: `cancel:${b.id}` }]),
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

export function confirmCancelKeyboard(bookingId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Cancel booking', callback_data: `cancel_confirm:${bookingId}` }],
      [{ text: 'Keep booking', callback_data: 'menu:bookings' }],
    ],
  }
}

export function calendarAuthKeyboard(googleUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Connect Google Calendar', url: googleUrl }],
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

export function calendarStatusKeyboard(input: { connectedProviders: string[]; googleUrl?: string }): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup['inline_keyboard'] = []
  if (input.googleUrl && !input.connectedProviders.includes('google')) {
    rows.push([{ text: 'Connect Google Calendar', url: input.googleUrl }])
  }
  if (input.connectedProviders.includes('google')) {
    rows.push([{ text: 'Disconnect Google Calendar', callback_data: 'calendar:disconnect:google' }])
  }
  if (input.connectedProviders.includes('microsoft')) {
    rows.push([{ text: 'Disconnect Outlook Calendar', callback_data: 'calendar:disconnect:microsoft' }])
  }
  rows.push([{ text: 'Back to menu', callback_data: 'menu:start' }])
  return { inline_keyboard: rows }
}
