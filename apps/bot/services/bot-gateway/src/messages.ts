import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '@metrix/contracts'

export function welcomeMessage(firstName?: string): string {
  const name = firstName ? `, ${firstName}` : ''
  return [`Welcome${name}.`, '', 'Smart Booking helps you reserve rooms and desks in a few taps.', 'Choose an action below.'].join('\n')
}

export function helpMessage(): string {
  return [
    'What I can do:',
    '',
    '/book - choose a room or desk',
    '/slots - browse availability',
    '/my_bookings - view and cancel bookings',
    '/calendar - connect Google Calendar',
    '/help - show this message',
  ].join('\n')
}

export function locationsMessage(locations: BookingLocation[]): string {
  const list = locations.map((l) => `• ${l.name}, ${l.address} (${l.occupancy})`).join('\n')
  return ['Choose a location:', '', list].join('\n')
}

export function resourcesMessage(resources: BookingResource[]): string {
  if (resources.length === 0) return 'No offices available at this location.'
  const list = resources.map((r) => `• ${r.name} (${r.seats}, ${r.priceLabel})`).join('\n')
  return ['Choose an office or workspace:', '', list].join('\n')
}

export function slotsMessage(resource: BookingResource, slots: AvailableSlot[]): string {
  if (slots.length === 0) return `${resource.name} has no available slots right now.`
  return `Available slots for ${resource.name}:`
}

export function bookingConfirmationPrompt(resource: BookingResource, slot: AvailableSlot): string {
  return ['Please confirm your booking:', '', `Office: ${resource.name}`, `Seats: ${resource.seats}`, `Time: ${slot.startsAt} - ${slot.endsAt}`, `Due now: ${resource.priceLabel}`].join('\n')
}

export function bookingsMessage(bookings: Booking[]): string {
  if (bookings.length === 0) return 'You have no active bookings.'
  const list = bookings.map((b) => `• ${b.locationName}, ${b.resourceName}: ${b.startsAt} – ${b.endsAt}`).join('\n')
  return ['Your active bookings:', '', list, '', 'Choose a booking to manage it.'].join('\n')
}

export function bookingCreatedMessage(booking: Booking): string {
  return ['Booking confirmed.', '', booking.locationName, booking.resourceName, `${booking.startsAt} - ${booking.endsAt}`, `Paid: ${booking.priceLabel}`].join('\n')
}

export function calendarAuthMessage(input: { googleUrl?: string }): string {
  if (!input.googleUrl) return 'Google Calendar is not configured.'
  return ['Calendar connection', '', 'Press the button below and choose your Google account.', 'After approval I will connect the calendar automatically.'].join('\n')
}

export function calendarStatusMessage(connectedProviders: string[]): string {
  const lines = ['Calendar', '']
  for (const p of connectedProviders) {
    lines.push(`${p === 'google' ? 'Google Calendar' : 'Outlook Calendar'}: connected`)
  }
  lines.push('', 'You can disconnect a calendar below.')
  return lines.join('\n')
}
