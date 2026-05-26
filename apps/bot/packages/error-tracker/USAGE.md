# Подключение @metrix/error-tracker к сервису

## 1. Добавить зависимость

В `package.json` сервиса:

```json
{
  "dependencies": {
    "@metrix/error-tracker": "*"
  }
}
```

## 2. Инициализировать в index.ts

Вызов `errorTracker.init()` должен быть первой строкой до всех импортов сторонних библиотек —
Sentry перехватывает ошибки на уровне Node.js runtime.

```ts
// index.ts — самый верх файла, до остальных импортов
import { errorTracker, readErrorTrackerConfig } from '@metrix/error-tracker'

const errorTrackerConfig = readErrorTrackerConfig(process.env, 'booking-service')
errorTracker.init(errorTrackerConfig)

// ... остальные импорты и старт сервиса
```

## 3. Использовать в обработчиках ошибок

```ts
import { errorTracker } from '@metrix/error-tracker'

// В HTTP router — поймали неожиданную ошибку:
try {
  await doSomething()
} catch (error) {
  errorTracker.captureError(error, {
    service: 'booking-service',
    method: req.method ?? 'UNKNOWN',
    path: req.url ?? '/',
    requestId: requestId,
  })
  sendJson(res, { error: 'internal server error' }, 500)
}
```

## 4. Добавить flush в graceful shutdown

```ts
installGracefulShutdown({
  logger,
  resources: [
    // Flush должен идти последним — чтобы успеть отправить ошибки перед закрытием процесса.
    async () => {
      await errorTracker.flush()
    },
  ],
  server,
  service: 'booking-service',
})
```

## 5. Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `SENTRY_DSN` | Нет | DSN проекта в GlitchTip/Sentry. Если пустой — no-op режим |
| `SENTRY_ENVIRONMENT` | Нет | `development` / `staging` / `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Нет | Доля трейсов 0.0–1.0 (по умолчанию 0.1) |
