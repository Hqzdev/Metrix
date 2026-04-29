import type { Booking } from '../services/booking-service.js'

export type BookingCalendarLinks = {
  google: string
  outlook: string
}

// создаёт ссылки на добавление бронирования в google calendar и outlook
export function createBookingCalendarLinks(booking: Booking): BookingCalendarLinks {
  const title = `Booking: ${booking.resourceName}`
  const details = [
    booking.locationName,
    booking.resourceName,
    `${booking.startsAt} - ${booking.endsAt}`,
    `Paid: ${booking.priceLabel}`,
  ].join('\n')

  return {
    google: createGoogleCalendarUrl({ booking, details, title }),
    outlook: createOutlookCalendarUrl({ booking, details, title }),
  }
}

// формирует url для google calendar
function createGoogleCalendarUrl(input: { booking: Booking; details: string; title: string }): string {
  const dates = `${toGoogleDate(input.booking.startsAtIso)}/${toGoogleDate(input.booking.endsAtIso)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    dates,
    details: input.details,
    location: input.booking.locationName,
    text: input.title,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// формирует url для outlook calendar
function createOutlookCalendarUrl(input: { booking: Booking; details: string; title: string }): string {
  const params = new URLSearchParams({
    body: input.details,
    enddt: input.booking.endsAtIso,
    location: input.booking.locationName,
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: input.booking.startsAtIso,
    subject: input.title,
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// конвертирует iso дату в формат google calendar (yyyymmddThhmmssZ)
function toGoogleDate(value: string): string {
  return value.replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}
