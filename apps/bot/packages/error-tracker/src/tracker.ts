import * as Sentry from '@sentry/node'
import type { ErrorExtras, ErrorTrackerConfig, RequestContext } from './types.js'

/**
 * Обёртка над Sentry SDK для единообразного трекинга ошибок во всех сервисах.
 *
 * Важно:
 * - Инициализация (init) должна вызываться один раз при старте процесса,
 *   до создания HTTP-сервера и подключения к внешним сервисам.
 * - Если DSN не задан, все методы работают как no-op — это позволяет
 *   не настраивать Sentry для локальной разработки.
 * - captureError логирует в Sentry ровно одну запись: не вызывайте его
 *   несколько раз для одной и той же ошибки.
 */
export class ErrorTracker {
  // Флаг показывает, прошла ли инициализация Sentry SDK.
  // Проверяем его перед каждым вызовом, чтобы не крашиться при no-op режиме.
  private initialized = false

  /**
   * Инициализирует Sentry SDK.
   *
   * Если DSN не задан — пропускает инициализацию и переключается в no-op режим.
   * Вызывайте этот метод один раз при старте процесса.
   */
  init(config: ErrorTrackerConfig): void {
    // Без DSN Sentry бессмысленен — просто работаем без него.
    if (!config.dsn) {
      return
    }

    Sentry.init({
      dsn: config.dsn,
      // serverName появляется в Sentry как идентификатор сервиса-источника.
      serverName: config.service,
      environment: config.environment,
      // tracesSampleRate контролирует, сколько транзакций уходит на performance monitoring.
      tracesSampleRate: config.tracesSampleRate ?? 0.1,
      // integrations: убираем HTTP integration по умолчанию — у нас нет Express,
      // сервисы используют нативный node:http.
      integrations: (integrations) =>
        integrations.filter((integration) => integration.name !== 'Http'),
    })

    this.initialized = true
  }

  /**
   * Отправляет ошибку в Sentry с опциональным контекстом запроса.
   *
   * Контекст запроса (requestId, method, path) позволяет быстро найти
   * связанные записи в логах по одному requestId.
   */
  captureError(error: unknown, context?: RequestContext, extras?: ErrorExtras): void {
    // В no-op режиме просто ничего не делаем.
    if (!this.initialized) return

    Sentry.withScope((scope) => {
      // Уровень критичности влияет на приоритет алерта в Sentry.
      if (extras?.level) {
        scope.setLevel(extras.level)
      }

      // requestId связывает запись Sentry с JSON-логом сервиса.
      if (context?.requestId) {
        scope.setTag('requestId', context.requestId)
      }

      // service позволяет фильтровать события по конкретному микросервису.
      if (context?.service) {
        scope.setTag('service', context.service)
      }

      // HTTP-контекст появится в секции "Request" в Sentry UI.
      if (context) {
        scope.setContext('request', {
          method: context.method,
          path: context.path,
          requestId: context.requestId,
        })
      }

      // Произвольные теги для фильтрации в Sentry (например, bookingId, userId).
      if (extras?.tags) {
        for (const [key, value] of Object.entries(extras.tags)) {
          scope.setTag(key, value)
        }
      }

      // Дополнительные данные появятся в разделе "Additional Data" в Sentry.
      if (extras?.extra) {
        scope.setContext('extra', extras.extra)
      }

      // Sentry принимает как Error объекты, так и строки.
      Sentry.captureException(error)
    })
  }

  /**
   * Записывает информационное сообщение в Sentry без ошибки.
   *
   * Используйте для событий, важных для понимания контекста:
   * "сервис запустился в degraded режиме", "фича-флаг отключён" и т.д.
   */
  captureMessage(message: string, extras?: Pick<ErrorExtras, 'tags' | 'extra' | 'level'>): void {
    if (!this.initialized) return

    Sentry.withScope((scope) => {
      if (extras?.level) {
        scope.setLevel(extras.level)
      }

      if (extras?.tags) {
        for (const [key, value] of Object.entries(extras.tags)) {
          scope.setTag(key, value)
        }
      }

      if (extras?.extra) {
        scope.setContext('extra', extras.extra)
      }

      Sentry.captureMessage(message)
    })
  }

  /**
   * Сбрасывает буфер событий Sentry перед завершением процесса.
   *
   * Вызывайте в обработчике graceful shutdown, чтобы не потерять последние ошибки.
   * timeout: 2000 — даём Sentry 2 секунды на отправку, потом завершаем процесс.
   */
  async flush(timeoutMs = 2_000): Promise<void> {
    if (!this.initialized) return

    await Sentry.flush(timeoutMs)
  }
}

// Синглтон доступен во всех файлах сервиса без необходимости пробрасывать через DI.
// Инициализировать его нужно один раз через errorTracker.init(config) в index.ts.
export const errorTracker = new ErrorTracker()
