import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '../services/booking-service.js'

type AdminStats = {
  active: number
  cancelled: number
  rescheduled: number
  revenue: number
  total: number
}

// создем приветсвтенное сообщение
export function welcomeMessage(firstName?: string): string {
  // тут добавляем имя если оно только есть чтобы ниче не сломалось
  const name = firstName ? `, ${firstName}` : ''
  return [
    `Welcome${name}.`,
    '',
    'Smart Booking helps you reserve rooms and desks in a few taps.',
    'Choose an action below.',
  ].join('\n')
}
// вызываем help сообщение
export function helpMessage(): string {
  return [
    'What I can do:',
    '',
    '/book - choose a room or desk and reserve a free slot',
    '/slots - browse current availability',
    '/my_bookings - view and cancel active bookings',
    '/calendar - connect Google Calendar or Outlook',
    '/admin - open admin tools if your Telegram ID is allowed',
    '/help - show this help message',
  ].join('\n')
}
// меню админа
export function adminMenuMessage(): string {
  return ['Admin panel', '', 'Choose what you want to edit.'].join('\n')
}
// вывод списка локаций для админа
export function adminLocationsMessage(locations: BookingLocation[]): string {
  return ['Locations:', '', ...locations.map((location) => `• ${location.name}: ${location.occupancy}`)].join('\n')
}
// детальная инфа перед редактированием
export function adminLocationMessage(location: BookingLocation): string {
  return [
    location.name,
    '',
    `Address: ${location.address}`,
    `Occupancy: ${location.occupancy}`,
    `Members: ${location.members}`,
  ].join('\n')
}
// список ресурсов внутри локаций
export function adminResourcesMessage(resources: BookingResource[]): string {
  if (resources.length === 0) {
    return 'No resources at this location.'
  }
  return [
    'Resources:',
    '',
    ...resources.map((resource) => `• ${resource.name}: ${resource.priceLabel}, ${resource.occupancy}, ${resource.status}`),
  ].join('\n')
}
// детали конкретной локации вызываем
export function adminResourceMessage(resource: BookingResource): string {
  return [
    resource.name,
    '',
    `Seats: ${resource.seats}`,
    `Price: ${resource.priceLabel}`,
    `Occupancy: ${resource.occupancy}`,
    `Status: ${resource.status}`,
  ].join('\n')
}
// текст для админа
export function adminEditPromptMessage(fieldLabel: string): string {
  return `Send a new value for ${fieldLabel}.`
}
// статистика бронирований для администратора
export function adminStatsMessage(stats: AdminStats): string {
  return [
    'Statistics',
    '',
    `Total bookings: ${stats.total}`,
    `Active: ${stats.active}`,
    `Cancelled: ${stats.cancelled}`,
    `Rescheduled: ${stats.rescheduled}`,
    `Revenue: ${(stats.revenue / 100).toFixed(2)} ₽`,
  ].join('\n')
}
// список всех бронирований для администратора
export function adminAllBookingsMessage(bookings: Booking[]): string {
  if (bookings.length === 0) {
    return 'No bookings yet.'
  }
  const recent = bookings.slice(-20)
  const list = recent
    .map((b) => `• [${b.status}] ${b.resourceName}: ${b.startsAt} (user ${b.telegramUserId})`)
    .join('\n')
  return [`All bookings (last ${recent.length}):`, '', list].join('\n')
}
// сообщение администратору при невозможности сопоставить оплату
export function paymentEscalationMessage(details: { invoicePayload?: string; telegramUserId?: number }): string {
  return [
    'Unmatched payment received.',
    '',
    `User: ${details.telegramUserId ?? 'unknown'}`,
    `Payload: ${details.invoicePayload ?? 'unknown'}`,
    '',
    'Manual action required.',
  ].join('\n')
}

export function calendarAuthMessage(input: { googleUrl?: string; microsoftUrl?: string }): string {
  return [
    'Calendar connection',
    '',
    input.googleUrl ? `Google: ${input.googleUrl}` : 'Google is not configured.',
    '',
    input.microsoftUrl ? `Microsoft Outlook: ${input.microsoftUrl}` : 'Microsoft Outlook is not configured.',
    '',
    'After approving access, send:',
    '/connect_google <code>',
    '/connect_outlook <code>',
    '',
    'Admins can connect a room calendar with:',
    '/connect_google <resourceId> <code>',
    '/connect_outlook <resourceId> <code>',
  ].join('\n')
}

export function calendarConnectedMessage(provider: string, scope: string, resourceId?: string): string {
  return [
    'Calendar connected.',
    '',
    `Provider: ${provider}`,
    `Scope: ${scope}`,
    resourceId ? `Resource: ${resourceId}` : undefined,
  ]
    .filter(Boolean)
    .join('\n')
}
// список доступных локаций для пользователя
export function resourcesMessage(resources: BookingResource[]): string {
  if (resources.length === 0) {
    return 'No offices are available at this location right now.'
  }
  const resourceList = resources
    .map((resource) => `• ${resource.name} (${resource.seats}, ${resource.priceLabel})`)
    .join('\n')
  return ['Choose an office or workspace:', '', resourceList].join('\n')
}
// список локаций показывем для выбора
export function locationsMessage(locations: BookingLocation[]): string {
  const locationList = locations
    .map((location) => `• ${location.name}, ${location.address} (${location.occupancy})`)
    .join('\n')
  return ['Choose a location first:', '', locationList].join('\n')
}
// сообщение перед выбором пишем
export function slotsMessage(resource: BookingResource, slots: AvailableSlot[]): string {
  if (slots.length === 0) {
    return `${resource.name} has no available slots right now.`
  }

  return `Available slots for ${resource.name}:`
}
// подтвережрнеие перед бронированием
export function bookingConfirmationPrompt(resource: BookingResource, slot: AvailableSlot): string {
  return [
    'Please confirm your booking:',
    '',
    `Office: ${resource.name}`,
    `Seats: ${resource.seats}`,
    `Time: ${slot.startsAt} - ${slot.endsAt}`,
    `Due now: ${resource.priceLabel}`,
  ].join('\n')
}
// сообщение перед оплатой
export function bookingInvoiceSentMessage(): string {
  return [
    'Payment invoice sent.',
    '',
    'Complete the payment in Telegram, and I will confirm the booking right away.',
  ].join('\n')
}
// подтвержение бронирования
export function bookingCreatedMessage(booking: Booking): string {
  return [
    'Booking confirmed.',
    '',
    `${booking.locationName}`,
    `${booking.resourceName}`,
    `${booking.startsAt} - ${booking.endsAt}`,
    `Paid: ${booking.priceLabel}`,
  ].join('\n')
}
// список всех бронирований актвных
export function bookingsMessage(bookings: Booking[]): string {
  if (bookings.length === 0) {
    return 'You have no active bookings.'
  }
  const bookingList = bookings
    .map((booking) => `• ${booking.locationName}, ${booking.resourceName}: ${booking.startsAt} - ${booking.endsAt}`)
    .join('\n')
  return ['Your active bookings:', '', bookingList, '', 'Choose a booking to manage it.'].join('\n')
}
// список слотов для переноса бронирования
export function rescheduleSlotsMessage(booking: Booking, slots: AvailableSlot[]): string {
  if (slots.length === 0) {
    return `No available slots to reschedule ${booking.resourceName}.`
  }
  return `Choose a new time for ${booking.resourceName}:`
}
// экран подтверждения переноса бронирования
export function rescheduleConfirmMessage(booking: Booking, slot: AvailableSlot): string {
  return [
    'Reschedule booking:',
    '',
    `${booking.resourceName}`,
    `New time: ${slot.startsAt} - ${slot.endsAt}`,
    '',
    'The current booking will be cancelled and a new one created.',
  ].join('\n')
}
// уведомление об успешном переносе бронирования
export function rescheduleSuccessMessage(booking: Booking): string {
  return [
    'Booking rescheduled.',
    '',
    `${booking.locationName}`,
    `${booking.resourceName}`,
    `${booking.startsAt} - ${booking.endsAt}`,
  ].join('\n')
}
// напоминание пользователю за 15 минут до начала бронирования
export function reminderMessage(booking: Booking): string {
  return [
    'Your booking starts in 15 minutes.',
    '',
    `${booking.locationName}`,
    `${booking.resourceName}`,
    `${booking.startsAt} - ${booking.endsAt}`,
  ].join('\n')
}
