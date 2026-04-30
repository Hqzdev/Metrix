import {
  adminAllBookingsKeyboard,
  adminAnalyticsBackKeyboard,
  adminAnalyticsMenuKeyboard,
  adminLocationKeyboard,
  adminLocationsKeyboard,
  adminMenuKeyboard,
  adminReportFailedKeyboard,
  adminReportPendingKeyboard,
  adminResourceKeyboard,
  adminResourcesKeyboard,
  adminStatsKeyboard,
  mainMenuKeyboard,
} from './keyboards.js'
import {
  adminAllBookingsMessage,
  adminAnalyticsMenuMessage,
  adminAnalyticsSummaryMessage,
  adminEditPromptMessage,
  adminHeatmapMessage,
  adminLocationMessage,
  adminLocationsMessage,
  adminMenuMessage,
  adminPeakHoursMessage,
  adminReportFailedMessage,
  adminReportPendingMessage,
  adminResourceMessage,
  adminResourcesMessage,
  adminStatsMessage,
  adminUtilizationMessage,
} from './messages.js'
import type { Logger } from '../lib/logger.js'
import type { TelegramClient } from '../lib/telegram-client.js'
import type { TelegramMessage } from '../lib/telegram-types.js'
import type { BookingLocation, BookingResource, BookingService } from '../services/booking-service.js'
import { AnalyticsService } from '../services/analytics-service.js'
import type { AnalyticsFilter } from '../services/analytics-service.js'
import { ReportService } from '../services/report-service.js'
import { ReportQueue } from '../services/report-queue.js'
import { generateAnalyticsPdf } from '../services/pdf-generator.js'

type AdminControllerOptions = {
  adminTelegramIds: number[]
  bookingService: BookingService
  logger: Logger
  paymentCurrency: string
  telegram: TelegramClient
}

type AdminEditState =
  | { field: 'location-members' | 'location-occupancy'; locationId: string }
  | { field: 'resource-occupancy' | 'resource-price' | 'resource-status'; resourceId: string }

export class AdminController {
  private readonly editStatesByUserId = new Map<number, AdminEditState>()
  private readonly analyticsService: AnalyticsService
  private readonly reportService: ReportService
  private readonly reportQueue: ReportQueue

  constructor(private readonly options: AdminControllerOptions) {
    this.analyticsService = new AnalyticsService(options.bookingService)
    this.reportService = new ReportService()
    this.reportQueue = new ReportQueue()
  }

  // проверяет наличие незавершённого редактирования для пользователя
  hasPendingEdit(telegramUserId: number): boolean {
    return this.editStatesByUserId.has(telegramUserId)
  }

  // показывает главное меню администратора
  async showMenu(message: TelegramMessage): Promise<void> {
    if (!message.from?.id || !this.isAdmin(message.from.id)) {
      await this.options.telegram.sendMessage(message.chat.id, 'Admin access is not enabled for your Telegram ID.')
      return
    }

    await this.options.telegram.sendMessage(message.chat.id, adminMenuMessage(), {
      reply_markup: adminMenuKeyboard(),
    })
  }

  // обрабатывает нажатие inline-кнопки в административной панели
  async handleCallback(chatId: number, messageId: number, telegramUserId: number, data: string): Promise<void> {
    if (!this.isAdmin(telegramUserId)) {
      await this.options.telegram.editMessageText(chatId, messageId, 'Admin access is not enabled for your Telegram ID.', {
        reply_markup: mainMenuKeyboard(),
      })
      return
    }

    if (data === 'admin:menu') {
      await this.options.telegram.editMessageText(chatId, messageId, adminMenuMessage(), {
        reply_markup: adminMenuKeyboard(),
      })
      return
    }

    if (data === 'admin:stats') {
      await this.editStats(chatId, messageId)
      return
    }

    if (data === 'admin:all_bookings') {
      await this.editAllBookings(chatId, messageId)
      return
    }

    if (data === 'admin:analytics') {
      await this.options.telegram.editMessageText(chatId, messageId, adminAnalyticsMenuMessage(), {
        reply_markup: adminAnalyticsMenuKeyboard(),
      })
      return
    }

    if (data === 'admin:analytics:summary') {
      await this.editAnalyticsSummary(chatId, messageId)
      return
    }

    if (data === 'admin:analytics:heatmap') {
      await this.editAnalyticsHeatmap(chatId, messageId)
      return
    }

    if (data === 'admin:analytics:utilization') {
      await this.editAnalyticsUtilization(chatId, messageId)
      return
    }

    if (data === 'admin:analytics:peak') {
      await this.editAnalyticsPeakHours(chatId, messageId)
      return
    }

    if (data === 'admin:report:export') {
      await this.startReportExport(chatId, messageId)
      return
    }

    if (data.startsWith('admin:report:refresh:')) {
      await this.refreshReportStatus(chatId, messageId, data.replace('admin:report:refresh:', ''))
      return
    }

    if (data === 'admin:locations') {
      await this.editLocations(chatId, messageId)
      return
    }

    if (data.startsWith('admin:location:')) {
      await this.editLocation(chatId, messageId, data.replace('admin:location:', ''))
      return
    }

    if (data.startsWith('admin:resources:')) {
      const locationId = data.replace('admin:resources:', '')
      const resources = await this.options.bookingService.listResources(locationId)
      await this.options.telegram.editMessageText(chatId, messageId, adminResourcesMessage(resources), {
        reply_markup: adminResourcesKeyboard(locationId, resources),
      })
      return
    }

    if (data.startsWith('admin:resource:')) {
      await this.editResource(chatId, messageId, data.replace('admin:resource:', ''))
      return
    }

    const editState = parseAdminEditCallback(data)
    if (editState) {
      this.editStatesByUserId.set(telegramUserId, editState)
      await this.options.telegram.editMessageText(chatId, messageId, adminEditPromptMessage(describeAdminField(editState)), {
        reply_markup: adminMenuKeyboard(),
      })
    }
  }

  // применяет значение из текстового сообщения при активном режиме редактирования
  async handleEditMessage(message: TelegramMessage, value: string): Promise<void> {
    const telegramUserId = message.from?.id
    const editState = telegramUserId ? this.editStatesByUserId.get(telegramUserId) : undefined

    if (!telegramUserId || !editState || !this.isAdmin(telegramUserId)) {
      return
    }

    try {
      await this.applyEdit(message.chat.id, telegramUserId, editState, value)
    } catch (error) {
      this.options.logger.error('Failed to apply admin edit', { error })
      await this.options.telegram.sendMessage(message.chat.id, 'Could not save this value. Check the format and try again.', {
        reply_markup: adminMenuKeyboard(),
      })
    }
  }

  // создаёт запись отчёта и ставит задачу генерации pdf в очередь
  private async startReportExport(chatId: number, messageId: number): Promise<void> {
    const filter = defaultAnalyticsFilter()
    const record = this.reportService.createReport(filter)

    await this.options.telegram.editMessageText(chatId, messageId, adminReportPendingMessage(record.reportId, 'pending'), {
      reply_markup: adminReportPendingKeyboard(record.reportId),
    })

    this.reportQueue.enqueue(async () => {
      this.reportService.markProcessing(record.reportId)
      try {
        const [summary, heatmapCells, utilization, peakHours] = await Promise.all([
          this.analyticsService.getSummary(filter),
          this.analyticsService.getHeatmap(filter),
          this.analyticsService.getUtilization(filter),
          this.analyticsService.getPeakHours(filter),
        ])
        const buffer = await generateAnalyticsPdf({ summary, heatmapCells, utilization, peakHours })
        this.reportService.markCompleted(record.reportId, buffer)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        this.reportService.markFailed(record.reportId, message)
        this.options.logger.error('PDF report generation failed', { error, reportId: record.reportId })
      }
    })
  }

  // проверяет статус отчёта и отправляет pdf если готов
  private async refreshReportStatus(chatId: number, messageId: number, reportId: string): Promise<void> {
    const record = this.reportService.getReport(reportId)

    if (!record) {
      await this.options.telegram.editMessageText(chatId, messageId, 'Report not found. It may have expired after a bot restart.', {
        reply_markup: adminAnalyticsMenuKeyboard(),
      })
      return
    }

    if (record.status === 'completed' && record.pdfBuffer) {
      const filename = `analytics_${record.filter.dateFrom.toISOString().slice(0, 10)}_${record.filter.dateTo.toISOString().slice(0, 10)}.pdf`
      await this.options.telegram.sendDocument(chatId, record.pdfBuffer, filename)
      await this.options.telegram.editMessageText(chatId, messageId, 'PDF report sent above.', {
        reply_markup: adminAnalyticsBackKeyboard(),
      })
      return
    }

    if (record.status === 'failed') {
      await this.options.telegram.editMessageText(chatId, messageId, adminReportFailedMessage(record.error ?? 'Unknown error'), {
        reply_markup: adminReportFailedKeyboard(),
      })
      return
    }

    await this.options.telegram.editMessageText(chatId, messageId, adminReportPendingMessage(record.reportId, record.status as 'pending' | 'processing'), {
      reply_markup: adminReportPendingKeyboard(record.reportId),
    })
  }

  // показывает экран статистики бронирований
  private async editStats(chatId: number, messageId: number): Promise<void> {
    const allBookings = await this.options.bookingService.listAllBookings()
    const stats = {
      total: allBookings.length,
      active: allBookings.filter((b) => b.status === 'active').length,
      cancelled: allBookings.filter((b) => b.status === 'cancelled').length,
      rescheduled: allBookings.filter((b) => b.status === 'rescheduled').length,
      revenue: allBookings
        .filter((b) => b.status === 'active')
        .reduce((sum, b) => sum + b.paidAmountMinorUnits, 0),
    }
    await this.options.telegram.editMessageText(chatId, messageId, adminStatsMessage(stats), {
      reply_markup: adminStatsKeyboard(),
    })
  }

  // показывает экран всех бронирований системы
  private async editAllBookings(chatId: number, messageId: number): Promise<void> {
    const allBookings = await this.options.bookingService.listAllBookings()
    await this.options.telegram.editMessageText(chatId, messageId, adminAllBookingsMessage(allBookings), {
      reply_markup: adminAllBookingsKeyboard(),
    })
  }

  // показывает сводную аналитику за последние 30 дней
  private async editAnalyticsSummary(chatId: number, messageId: number): Promise<void> {
    const filter = defaultAnalyticsFilter()
    const summary = await this.analyticsService.getSummary(filter)
    await this.options.telegram.editMessageText(chatId, messageId, adminAnalyticsSummaryMessage(summary), {
      reply_markup: adminAnalyticsBackKeyboard(),
    })
  }

  // показывает heatmap занятости за последние 30 дней
  private async editAnalyticsHeatmap(chatId: number, messageId: number): Promise<void> {
    const filter = defaultAnalyticsFilter()
    const cells = await this.analyticsService.getHeatmap(filter)
    const period = { dateFrom: filter.dateFrom.toISOString().slice(0, 10), dateTo: filter.dateTo.toISOString().slice(0, 10) }
    await this.options.telegram.editMessageText(chatId, messageId, adminHeatmapMessage(cells, period), {
      reply_markup: adminAnalyticsBackKeyboard(),
    })
  }

  // показывает utilization по каждому ресурсу за последние 30 дней
  private async editAnalyticsUtilization(chatId: number, messageId: number): Promise<void> {
    const filter = defaultAnalyticsFilter()
    const resources = await this.analyticsService.getUtilization(filter)
    const period = { dateFrom: filter.dateFrom.toISOString().slice(0, 10), dateTo: filter.dateTo.toISOString().slice(0, 10) }
    await this.options.telegram.editMessageText(chatId, messageId, adminUtilizationMessage(resources, period), {
      reply_markup: adminAnalyticsBackKeyboard(),
    })
  }

  // показывает пиковые часы бронирований за последние 30 дней
  private async editAnalyticsPeakHours(chatId: number, messageId: number): Promise<void> {
    const filter = defaultAnalyticsFilter()
    const hours = await this.analyticsService.getPeakHours(filter)
    const period = { dateFrom: filter.dateFrom.toISOString().slice(0, 10), dateTo: filter.dateTo.toISOString().slice(0, 10) }
    await this.options.telegram.editMessageText(chatId, messageId, adminPeakHoursMessage(hours, period), {
      reply_markup: adminAnalyticsBackKeyboard(),
    })
  }

  // применяет изменение поля через сервис и очищает состояние редактирования
  private async applyEdit(
    chatId: number,
    telegramUserId: number,
    editState: AdminEditState,
    value: string,
  ): Promise<void> {
    if (editState.field === 'location-members' || editState.field === 'location-occupancy') {
      const location = await this.options.bookingService.updateLocation({
        locationId: editState.locationId,
        update: editState.field === 'location-members' ? { members: value } : { occupancy: value },
      })
      this.editStatesByUserId.delete(telegramUserId)
      await this.options.telegram.sendMessage(chatId, adminLocationMessage(location), {
        reply_markup: adminLocationKeyboard(location),
      })
      return
    }

    if (!('resourceId' in editState)) {
      throw new Error('Unsupported admin edit state.')
    }

    const resource = await this.findResourceById(editState.resourceId)
    const update =
      editState.field === 'resource-price'
        ? parseAdminPrice(value, this.options.paymentCurrency)
        : editState.field === 'resource-occupancy'
          ? { occupancy: value }
          : { status: value }
    const updatedResource = await this.options.bookingService.updateResource({
      resourceId: resource.id,
      update,
    })

    this.editStatesByUserId.delete(telegramUserId)
    await this.options.telegram.sendMessage(chatId, adminResourceMessage(updatedResource), {
      reply_markup: adminResourceKeyboard(updatedResource),
    })
  }

  // обновляет сообщение со списком локаций
  private async editLocations(chatId: number, messageId: number): Promise<void> {
    const locations = await this.options.bookingService.listLocations()
    await this.options.telegram.editMessageText(chatId, messageId, adminLocationsMessage(locations), {
      reply_markup: adminLocationsKeyboard(locations),
    })
  }

  // обновляет сообщение с деталями локации
  private async editLocation(chatId: number, messageId: number, locationId: string): Promise<void> {
    const location = await this.findLocation(locationId)
    await this.options.telegram.editMessageText(chatId, messageId, adminLocationMessage(location), {
      reply_markup: adminLocationKeyboard(location),
    })
  }

  // обновляет сообщение с деталями ресурса
  private async editResource(chatId: number, messageId: number, resourceId: string): Promise<void> {
    const resource = await this.findResourceById(resourceId)
    await this.options.telegram.editMessageText(chatId, messageId, adminResourceMessage(resource), {
      reply_markup: adminResourceKeyboard(resource),
    })
  }

  // ищет локацию по идентификатору
  private async findLocation(locationId: string): Promise<BookingLocation> {
    const locations = await this.options.bookingService.listLocations()
    const location = locations.find((item) => item.id === locationId)

    if (!location) {
      throw new Error('Location was not found.')
    }

    return location
  }

  // ищет ресурс по идентификатору во всех локациях
  private async findResourceById(resourceId: string): Promise<BookingResource> {
    const locations = await this.options.bookingService.listLocations()

    for (const location of locations) {
      const resource = (await this.options.bookingService.listResources(location.id)).find(
        (item) => item.id === resourceId,
      )

      if (resource) {
        return resource
      }
    }

    throw new Error('Resource was not found.')
  }

  // проверяет наличие прав администратора у пользователя
  private isAdmin(telegramUserId: number): boolean {
    return this.options.adminTelegramIds.includes(telegramUserId)
  }
}

// парсит callback_data административного редактирования
function parseAdminEditCallback(data: string): AdminEditState | null {
  const [, action, field, id] = data.split(':')

  if (action !== 'edit' || !field || !id) {
    return null
  }

  if (field === 'location-members' || field === 'location-occupancy') {
    return { field, locationId: id }
  }

  if (field === 'resource-occupancy' || field === 'resource-price' || field === 'resource-status') {
    return { field, resourceId: id }
  }

  return null
}

// возвращает человекочитаемое название поля для редактирования
function describeAdminField(editState: AdminEditState): string {
  const labels: Record<AdminEditState['field'], string> = {
    'location-members': 'location members',
    'location-occupancy': 'location occupancy',
    'resource-occupancy': 'resource occupancy',
    'resource-price': 'resource price',
    'resource-status': 'resource status',
  }

  return labels[editState.field]
}

// парсит цену из строки и конвертирует в минорные единицы
function parseAdminPrice(value: string, currency: string): { priceLabel: string; priceMinorUnits: number } {
  const normalizedValue = value.replace(',', '.').trim()
  const amount = Number(normalizedValue.match(/\d+(\.\d{1,2})?/)?.[0])

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Price should be a positive number.')
  }

  return {
    priceLabel: currency === 'RUB' ? `${formatMoney(amount)} ₽` : `${formatMoney(amount)} ${currency}`,
    priceMinorUnits: Math.round(amount * 100),
  }
}

// форматирует число для отображения суммы
function formatMoney(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

// возвращает фильтр за последние 30 дней
function defaultAnalyticsFilter(): AnalyticsFilter {
  const dateTo = new Date()
  const dateFrom = new Date()
  dateFrom.setDate(dateTo.getDate() - 30)
  return { dateFrom, dateTo }
}
