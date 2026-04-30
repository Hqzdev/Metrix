import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '../services/booking-service.js'
import type { AnalyticsSummary, OccupancyHeatmapCell, PeakHour, ResourceUtilization } from '../services/analytics-service.js'

type AdminStats = {
  active: number
  cancelled: number
  rescheduled: number
  revenue: number
  total: number
}

// формирует приветственное сообщение с именем пользователя
export function welcomeMessage(firstName?: string): string {
  const name = firstName ? `, ${firstName}` : ''
  return [
    `Welcome${name}.`,
    '',
    'Smart Booking helps you reserve rooms and desks in a few taps.',
    'Choose an action below.',
  ].join('\n')
}

// формирует сообщение с перечнем команд помощи
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

// формирует заголовок меню администратора
export function adminMenuMessage(): string {
  return ['Admin panel', '', 'Choose what you want to edit.'].join('\n')
}

// формирует список локаций для административной панели
export function adminLocationsMessage(locations: BookingLocation[]): string {
  return ['Locations:', '', ...locations.map((location) => `• ${location.name}: ${location.occupancy}`)].join('\n')
}

// формирует детали локации для редактирования
export function adminLocationMessage(location: BookingLocation): string {
  return [
    location.name,
    '',
    `Address: ${location.address}`,
    `Occupancy: ${location.occupancy}`,
    `Members: ${location.members}`,
  ].join('\n')
}

// формирует список ресурсов локации
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

// формирует детали ресурса для редактирования
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

// формирует приглашение ввести новое значение поля
export function adminEditPromptMessage(fieldLabel: string): string {
  return `Send a new value for ${fieldLabel}.`
}

// формирует сводку статистики бронирований
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

// формирует список всех бронирований системы
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

// формирует сообщение об неопознанном платеже для администратора
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

// формирует экран подключения календаря с ссылками авторизации
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

// формирует подтверждение успешного подключения календаря
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

// формирует список ресурсов локации для выбора пользователем
export function resourcesMessage(resources: BookingResource[]): string {
  if (resources.length === 0) {
    return 'No offices are available at this location right now.'
  }
  const resourceList = resources
    .map((resource) => `• ${resource.name} (${resource.seats}, ${resource.priceLabel})`)
    .join('\n')
  return ['Choose an office or workspace:', '', resourceList].join('\n')
}

// формирует список локаций для выбора
export function locationsMessage(locations: BookingLocation[]): string {
  const locationList = locations
    .map((location) => `• ${location.name}, ${location.address} (${location.occupancy})`)
    .join('\n')
  return ['Choose a location first:', '', locationList].join('\n')
}

// формирует список доступных слотов ресурса
export function slotsMessage(resource: BookingResource, slots: AvailableSlot[]): string {
  if (slots.length === 0) {
    return `${resource.name} has no available slots right now.`
  }
  return `Available slots for ${resource.name}:`
}

// формирует экран подтверждения бронирования перед оплатой
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

// формирует уведомление об отправленном инвойсе
export function bookingInvoiceSentMessage(): string {
  return [
    'Payment invoice sent.',
    '',
    'Complete the payment in Telegram, and I will confirm the booking right away.',
  ].join('\n')
}

// формирует подтверждение созданного бронирования
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

// формирует список активных бронирований пользователя
export function bookingsMessage(bookings: Booking[]): string {
  if (bookings.length === 0) {
    return 'You have no active bookings.'
  }
  const bookingList = bookings
    .map((booking) => `• ${booking.locationName}, ${booking.resourceName}: ${booking.startsAt} - ${booking.endsAt}`)
    .join('\n')
  return ['Your active bookings:', '', bookingList, '', 'Choose a booking to manage it.'].join('\n')
}

// формирует список слотов для переноса бронирования
export function rescheduleSlotsMessage(booking: Booking, slots: AvailableSlot[]): string {
  if (slots.length === 0) {
    return `No available slots to reschedule ${booking.resourceName}.`
  }
  return `Choose a new time for ${booking.resourceName}:`
}

// формирует экран подтверждения переноса бронирования
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

// формирует уведомление об успешном переносе бронирования
export function rescheduleSuccessMessage(booking: Booking): string {
  return [
    'Booking rescheduled.',
    '',
    `${booking.locationName}`,
    `${booking.resourceName}`,
    `${booking.startsAt} - ${booking.endsAt}`,
  ].join('\n')
}

// формирует напоминание за 15 минут до начала бронирования
export function reminderMessage(booking: Booking): string {
  return [
    'Your booking starts in 15 minutes.',
    '',
    `${booking.locationName}`,
    `${booking.resourceName}`,
    `${booking.startsAt} - ${booking.endsAt}`,
  ].join('\n')
}

// формирует экран ожидания или обработки pdf-отчёта
export function adminReportPendingMessage(reportId: string, status: 'pending' | 'processing'): string {
  const statusLabel = status === 'pending' ? 'Queued' : 'Generating PDF...'
  return ['PDF Report', '', `Status: ${statusLabel}`, `Report ID: ${reportId}`, '', 'Press Refresh to check again.'].join('\n')
}

// формирует сообщение об ошибке генерации отчёта
export function adminReportFailedMessage(error: string): string {
  return ['PDF Report', '', 'Status: Failed', '', `Error: ${error}`, '', 'You can try again.'].join('\n')
}

// формирует заголовок меню аналитики
export function adminAnalyticsMenuMessage(): string {
  return ['Analytics (last 30 days)', '', 'Choose a report to view.'].join('\n')
}

// формирует сводную статистику аналитики за период
export function adminAnalyticsSummaryMessage(summary: AnalyticsSummary): string {
  return [
    'Analytics Summary',
    `Period: ${summary.period.dateFrom} – ${summary.period.dateTo}`,
    '',
    `Total bookings: ${summary.totalBookings}`,
    `Active: ${summary.activeBookings}`,
    `Cancelled: ${summary.cancelledBookings}`,
    `Rescheduled: ${summary.rescheduledBookings}`,
    '',
    `Total booked time: ${summary.totalOccupiedMinutes} min`,
    `Average booking: ${summary.averageBookingMinutes} min`,
    `Resources used: ${summary.uniqueResources}`,
  ].join('\n')
}

// формирует топ занятых ячеек карты занятости
export function adminHeatmapMessage(cells: OccupancyHeatmapCell[], period: { dateFrom: string; dateTo: string }): string {
  if (cells.length === 0) {
    return `Occupancy Heatmap\nPeriod: ${period.dateFrom} – ${period.dateTo}\n\nNo bookings in this period.`
  }

  const top = cells
    .slice()
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent || b.bookings - a.bookings)
    .slice(0, 10)

  const rows = top.map(
    (cell, i) =>
      `${i + 1}. ${cell.date}  ${String(cell.hour).padStart(2, '0')}:00  ${cell.bookings} booking${cell.bookings !== 1 ? 's' : ''}  ${cell.occupiedMinutes} min  ${cell.occupancyPercent}%`,
  )

  return [
    'Occupancy Heatmap',
    `Period: ${period.dateFrom} – ${period.dateTo}`,
    '',
    `Top ${top.length} busiest hours:`,
    ...rows,
    '',
    `Total active cells: ${cells.length}`,
  ].join('\n')
}

// формирует utilization по каждому ресурсу за период
export function adminUtilizationMessage(
  resources: ResourceUtilization[],
  period: { dateFrom: string; dateTo: string },
): string {
  if (resources.length === 0) {
    return `Resource Utilization\nPeriod: ${period.dateFrom} – ${period.dateTo}\n\nNo resources found.`
  }

  const sorted = resources.slice().sort((a, b) => b.utilizationPercent - a.utilizationPercent)
  const rows = sorted.map((r) => `• ${r.resourceName}: ${r.occupiedMinutes} / ${r.availableMinutes} min · ${r.utilizationPercent}%`)

  return [
    'Resource Utilization',
    `Period: ${period.dateFrom} – ${period.dateTo}`,
    '',
    ...rows,
  ].join('\n')
}

// формирует список пиковых часов по убыванию загрузки
export function adminPeakHoursMessage(hours: PeakHour[], period: { dateFrom: string; dateTo: string }): string {
  if (hours.length === 0) {
    return `Peak Hours\nPeriod: ${period.dateFrom} – ${period.dateTo}\n\nNo bookings in this period.`
  }

  const top = hours.slice(0, 8)
  const rows = top.map(
    (h, i) =>
      `${i + 1}. ${String(h.hour).padStart(2, '0')}:00  ${h.bookings} booking${h.bookings !== 1 ? 's' : ''}  ${h.occupiedMinutes} min  ${h.occupancyPercent}%`,
  )

  return [
    'Peak Hours',
    `Period: ${period.dateFrom} – ${period.dateTo}`,
    '',
    ...rows,
  ].join('\n')
}
