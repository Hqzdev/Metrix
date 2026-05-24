export function normalizeRoute(rawUrl: string | undefined): string {
  // Нормализация нужна, чтобы не создавать отдельную метрику на каждый id.
  if (!rawUrl) return '/unknown'

  const path = rawUrl.split('?')[0] || '/'
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
    .replace(/\/[A-Za-z0-9_-]{16,}/g, '/:id')
}
