// Имена бакетов — единственный источник истины для всего проекта.
// Нельзя менять без миграции данных в MinIO.
export const BUCKETS = {
  // Сгенерированные аналитические отчёты (PDF, CSV).
  // Загружает worker-service, скачивает notification-service для отправки через Telegram.
  REPORTS: 'metrix-reports',

  // Планы этажей и фотографии рабочих мест.
  // Зарезервировано для будущего использования в web-приложении.
  RESOURCES: 'metrix-resources',
} as const

// Тип для строгой типизации имён бакетов.
export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]
