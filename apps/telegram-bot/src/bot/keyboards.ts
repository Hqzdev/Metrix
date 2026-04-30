import type { AvailableSlot, Booking, BookingLocation, BookingResource } from '../services/booking-service.js'
import type { InlineKeyboardMarkup } from '../lib/telegram-types.js'

export type CalendarLinks = {
  google: string
  outlook: string
}

// кнопка подключения google calendar
export function calendarAuthKeyboard(googleUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Connect Google Calendar', url: googleUrl }],
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

// главное меню с кнопками действий
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

// меню администратора с кнопками управления
export function adminMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Edit locations', callback_data: 'admin:locations' }],
      [{ text: 'Statistics', callback_data: 'admin:stats' }],
      [{ text: 'All bookings', callback_data: 'admin:all_bookings' }],
      [{ text: 'Analytics', callback_data: 'admin:analytics' }],
      [{ text: 'Back to user menu', callback_data: 'menu:start' }],
    ],
  }
}

// меню аналитики с выбором отчёта
export function adminAnalyticsMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Summary', callback_data: 'admin:analytics:summary' }],
      [{ text: 'Heatmap', callback_data: 'admin:analytics:heatmap' }],
      [{ text: 'Utilization', callback_data: 'admin:analytics:utilization' }],
      [{ text: 'Peak hours', callback_data: 'admin:analytics:peak' }],
      [{ text: 'Export PDF', callback_data: 'admin:report:export' }],
      [{ text: 'Back to admin', callback_data: 'admin:menu' }],
    ],
  }
}

// экран ожидания или обработки отчёта
export function adminReportPendingKeyboard(reportId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Refresh status', callback_data: `admin:report:refresh:${reportId}` }],
      [{ text: 'Back to analytics', callback_data: 'admin:analytics' }],
    ],
  }
}

// экран ошибки генерации отчёта
export function adminReportFailedKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Try again', callback_data: 'admin:report:export' }],
      [{ text: 'Back to analytics', callback_data: 'admin:analytics' }],
    ],
  }
}

// кнопка возврата в меню аналитики
export function adminAnalyticsBackKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Back to analytics', callback_data: 'admin:analytics' }],
    ],
  }
}

// список локаций в административной панели
export function adminLocationsKeyboard(locations: BookingLocation[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...locations.map((location) => [
        {
          text: `${location.name} · ${location.occupancy}`,
          callback_data: `admin:location:${location.id}`,
        },
      ]),
      [{ text: 'Back to admin', callback_data: 'admin:menu' }],
    ],
  }
}

// детали локации в административной панели
export function adminLocationKeyboard(location: BookingLocation): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Edit occupancy', callback_data: `admin:edit:location-occupancy:${location.id}` }],
      [{ text: 'Edit members', callback_data: `admin:edit:location-members:${location.id}` }],
      [{ text: 'Edit resources', callback_data: `admin:resources:${location.id}` }],
      [{ text: 'Back to locations', callback_data: 'admin:locations' }],
    ],
  }
}

// список ресурсов локации в административной панели
export function adminResourcesKeyboard(locationId: string, resources: BookingResource[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...resources.map((resource) => [
        {
          text: `${resource.name} · ${resource.priceLabel} · ${resource.occupancy}`,
          callback_data: `admin:resource:${resource.id}`,
        },
      ]),
      [{ text: 'Back to location', callback_data: `admin:location:${locationId}` }],
    ],
  }
}

// детали ресурса в административной панели
export function adminResourceKeyboard(resource: BookingResource): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Edit price', callback_data: `admin:edit:resource-price:${resource.id}` }],
      [{ text: 'Edit occupancy', callback_data: `admin:edit:resource-occupancy:${resource.id}` }],
      [{ text: 'Edit status', callback_data: `admin:edit:resource-status:${resource.id}` }],
      [{ text: 'Back to resources', callback_data: `admin:resources:${resource.locationId}` }],
    ],
  }
}

// кнопка возврата из экрана статистики
export function adminStatsKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Back to admin', callback_data: 'admin:menu' }],
    ],
  }
}

// кнопка возврата из экрана всех бронирований
export function adminAllBookingsKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Back to admin', callback_data: 'admin:menu' }],
    ],
  }
}

// список ресурсов для выбора пользователем
export function resourceKeyboard(resources: BookingResource[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...resources.map((resource) => [
        {
          text: `${resource.name} · ${resource.priceLabel}`,
          callback_data: `resource:${resource.locationId}:${resource.id}`,
        },
      ]),
      [{ text: 'Back to locations', callback_data: 'menu:book' }],
    ],
  }
}

// список локаций для выбора пользователем
export function locationKeyboard(locations: BookingLocation[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...locations.map((location) => [
        {
          text: `${location.name} · ${location.occupancy}`,
          callback_data: `location:${location.id}`,
        },
      ]),
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

// слоты выбранного ресурса для бронирования
export function slotsKeyboard(resource: BookingResource, slots: AvailableSlot[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...slots.map((slot) => [
        {
          text: `${slot.startsAt} - ${slot.endsAt}`,
          callback_data: `slot:${resource.id}:${slot.id}`,
        },
      ]),
      [{ text: 'Back to offices', callback_data: `location:${resource.locationId}` }],
    ],
  }
}

// подтверждение бронирования перед оплатой
export function confirmBookingKeyboard(resource: BookingResource, slotId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Pay 100% and book', callback_data: `confirm:${resource.id}:${slotId}` }],
      [{ text: 'Choose another slot', callback_data: `resource:${resource.locationId}:${resource.id}` }],
    ],
  }
}

// список бронирований с кнопками отмены и переноса
export function bookingsKeyboard(bookings: Booking[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...bookings.flatMap((booking) => [
        [
          { text: `Cancel: ${booking.resourceName}`, callback_data: `cancel:${booking.id}` },
          { text: 'Reschedule', callback_data: `reschedule:${booking.id}` },
        ],
      ]),
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}

// запрос подтверждения отмены бронирования
export function confirmCancelKeyboard(bookingId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Cancel booking', callback_data: `cancel_confirm:${bookingId}` }],
      [{ text: 'Keep booking', callback_data: 'menu:bookings' }],
    ],
  }
}

// слоты для переноса бронирования
export function rescheduleKeyboard(bookingId: string, slots: AvailableSlot[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...slots.map((slot) => [
        {
          text: `${slot.startsAt} - ${slot.endsAt}`,
          callback_data: `reschedule_slot:${bookingId}:${slot.id}`,
        },
      ]),
      [{ text: 'Back to bookings', callback_data: 'menu:bookings' }],
    ],
  }
}

// подтверждение переноса бронирования
export function rescheduleConfirmKeyboard(bookingId: string, slotId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Confirm reschedule', callback_data: `reschedule_confirm:${bookingId}:${slotId}` }],
      [{ text: 'Keep current booking', callback_data: 'menu:bookings' }],
    ],
  }
}

// ссылки на добавление события в календарь
export function bookingCalendarKeyboard(links: CalendarLinks): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Add to Google Calendar', url: links.google }],
      [{ text: 'Add to Outlook', url: links.outlook }],
      [{ text: 'Back to menu', callback_data: 'menu:start' }],
    ],
  }
}
