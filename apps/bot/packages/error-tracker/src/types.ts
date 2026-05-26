// Контекст запроса, который прикрепляется к каждой ошибке.
// Позволяет в Sentry быстро найти, какой именно запрос привёл к падению.
export type RequestContext = {
  // HTTP-метод (GET, POST и т.д.).
  method: string
  // URL без query string.
  path: string
  // Уникальный id запроса для корреляции с логами.
  requestId?: string
  // Имя сервиса, который обрабатывал запрос.
  service: string
}

// Дополнительные данные, которые можно приложить к отдельной ошибке.
export type ErrorExtras = {
  // Произвольные теги для фильтрации в Sentry UI.
  tags?: Record<string, string>
  // Произвольный контекст, который появится в "Additional Data" в Sentry.
  extra?: Record<string, unknown>
  // Уровень критичности: fatal означает, что сервис скорее всего остановился.
  level?: 'fatal' | 'error' | 'warning' | 'info'
}

// Конфигурация, которую нужно передать в ErrorTracker.init().
export type ErrorTrackerConfig = {
  // DSN получают в Sentry/GlitchTip: Settings -> Project -> Client Keys.
  // Если DSN пустой, ErrorTracker работает как no-op и не отправляет ничего.
  dsn: string | undefined
  // Имя сервиса появляется в Sentry как "project source" в каждом событии.
  service: string
  // Среда: production, staging, development.
  // События из development по умолчанию отфильтрованы в Sentry UI.
  environment: string
  // Доля транзакций для performance monitoring от 0 до 1.
  // 0.1 = 10% запросов, 1.0 = все запросы. Для production рекомендуется 0.1.
  tracesSampleRate?: number
}
