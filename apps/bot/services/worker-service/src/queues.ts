import { Queue } from 'bullmq'
import type Redis from 'ioredis'

/**
 * Имена очередей — единственный источник истины.
 * Нельзя менять без остановки всех workers и очистки Redis-ключей.
 */
export const QUEUE_NAMES = {
  REMINDERS: 'reminders',
  CALENDAR_REFRESH: 'calendar-refresh',
  REPORTS: 'reports',
} as const

// ─── Job Data Types ───────────────────────────────────────────────────────────

export type ReminderJobData = {
  bookingId: string
  telegramUserId: number
  chatId: number
  resourceName: string
  locationName: string
  startsAt: string       // human-readable, e.g. "14:00"
  startsAtIso: string    // ISO 8601 для timezone-safe расчётов
}

export type CalendarRefreshJobData = {
  connectionId: string
  telegramUserId: number
  provider: 'google' | 'microsoft'
}

export type ReportJobData = {
  reportId: string
  type: string
  requestedBy: number
  chatId: number
  dateFrom?: string
  dateTo?: string
}

// ─── Queue Factories ──────────────────────────────────────────────────────────

/**
 * Создаёт BullMQ Queue для постановки reminder-заданий.
 * Вызывается из booking-service при создании бронирования.
 */
export function createReminderQueue(connection: Redis): Queue<ReminderJobData> {
  return new Queue(QUEUE_NAMES.REMINDERS, { connection })
}

export function createCalendarRefreshQueue(connection: Redis): Queue<CalendarRefreshJobData> {
  return new Queue(QUEUE_NAMES.CALENDAR_REFRESH, { connection })
}

export function createReportQueue(connection: Redis): Queue<ReportJobData> {
  return new Queue(QUEUE_NAMES.REPORTS, { connection })
}
