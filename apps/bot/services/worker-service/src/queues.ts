import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

/**
 * Имена очередей — единственный источник истины.
 * Нельзя менять без остановки всех workers и очистки Redis-ключей.
 */
export const QUEUE_NAMES = {
  REMINDERS: 'reminders',
  COMPLETIONS: 'booking-completions',
  CALENDAR_REFRESH: 'calendar-refresh',
  REPORTS: 'reports',
} as const

// ─── Job Data Types ───────────────────────────────────────────────────────────

export type CompletionJobData = {
  // Booking, который нужно завершить.
  bookingId: string
  // Владелец booking.
  telegramUserId: number
}

export type ReminderJobData = {
  // Booking, по которому отправляем напоминание.
  bookingId: string
  // Telegram user id получателя.
  telegramUserId: number
  // Chat id для отправки сообщения.
  chatId: number
  language: 'en' | 'ru'  // Язык пользователя для локализации текста.
  // Название ресурса в тексте напоминания.
  resourceName: string 
  // Название локации в тексте напоминания.
  locationName: string
  startsAt: string       // Human-readable, например "14:00".
  startsAtIso: string    // ISO 8601 для timezone-safe расчётов.
}

export type CalendarRefreshJobData = {
  // CalendarConnection id из базы.
  connectionId: string
  // Владелец подключения.
  telegramUserId: number
  // Провайдер календаря.
  provider: 'google' | 'microsoft'
}

export type ReportJobData = {
  // Report id из базы.
  reportId: string
  // Тип отчёта.
  type: string
  // Кто запросил отчёт.
  requestedBy: number
  // Куда отправить готовый файл.
  chatId: number
  // Optional период отчёта.
  dateFrom?: string
  dateTo?: string
}

// ─── Queue Factories ──────────────────────────────────────────────────────────

/**
 * Создаёт BullMQ Queue для постановки reminder-заданий.
 * Вызывается из booking-service при создании бронирования.
 */
export function createReminderQueue(connection: Redis): Queue<ReminderJobData> {
  // Queue используется сервисами, которые ставят reminder jobs.
  return new Queue(QUEUE_NAMES.REMINDERS, { connection })
}

/**
 * Создаёт очередь обновления календарных токенов.
 */
export function createCalendarRefreshQueue(connection: Redis): Queue<CalendarRefreshJobData> {
  return new Queue(QUEUE_NAMES.CALENDAR_REFRESH, { connection })
}

/**
 * Создаёт очередь генерации отчётов.
 */
export function createReportQueue(connection: Redis): Queue<ReportJobData> {
  return new Queue(QUEUE_NAMES.REPORTS, { connection })
}
