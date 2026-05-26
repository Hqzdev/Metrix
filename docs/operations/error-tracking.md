# Error tracking: @metrix/error-tracker + GlitchTip

## Что это и зачем

`@metrix/error-tracker` — shared пакет, который оборачивает Sentry SDK для единообразного трекинга
ошибок во всех микросервисах. GlitchTip — self-hosted Sentry-совместимый сервер для приёма событий.

Без error tracking вы видите ошибки только в JSON-логах Vector — без группировки, без истории,
без алертов. GlitchTip группирует одинаковые ошибки, показывает частоту и позволяет назначить
ответственного.

## Как запустить локально

```bash
# Из директории apps/bot
cp .env.example .env
# Задайте GLITCHTIP_SECRET_KEY в .env (минимум 50 символов)

docker compose up glitchtip
```

GlitchTip UI доступен на `http://localhost:3011`.

**Первоначальная настройка:**

```bash
# Создать superuser-аккаунт
docker compose exec glitchtip ./manage.py createsuperuser
```

После этого зайдите в UI, создайте организацию и проект. Скопируйте DSN из
Settings → Project → Client Keys и добавьте его в `.env`:

```
SENTRY_DSN=http://your-key@localhost:3011/1
```

## Архитектура пакета

```
packages/error-tracker/
  src/
    index.ts      ← публичное API (реэкспорты)
    config.ts     ← readErrorTrackerConfig() читает env
    tracker.ts    ← ErrorTracker класс + errorTracker синглтон
    types.ts      ← типы: RequestContext, ErrorExtras, ErrorTrackerConfig
  .env.example
  USAGE.md        ← пример подключения в сервис
  package.json
  tsconfig.json
```

## Подключение в новый сервис

Шаг 1 — добавить зависимость в `package.json` сервиса:

```json
{ "dependencies": { "@metrix/error-tracker": "*" } }
```

Шаг 2 — инициализировать в `index.ts` **первой строкой**, до других импортов:

```ts
import { errorTracker, readErrorTrackerConfig } from '@metrix/error-tracker'
errorTracker.init(readErrorTrackerConfig(process.env, 'my-service'))
```

Шаг 3 — ловить ошибки в router-е:

```ts
} catch (error) {
  errorTracker.captureError(error, {
    service: 'my-service',
    method: req.method ?? 'UNKNOWN',
    path: req.url ?? '/',
    requestId,
  })
}
```

Шаг 4 — добавить flush в graceful shutdown:

```ts
resources: [
  async () => { await errorTracker.flush() },
]
```

Полный пример — в `packages/error-tracker/USAGE.md`.

## No-op режим

Если `SENTRY_DSN` не задан — все методы ErrorTracker работают как no-op и ничего не отправляют.
Это позволяет использовать пакет без настройки GlitchTip для локальной разработки.

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `SENTRY_DSN` | Нет | DSN проекта. Если пустой — no-op |
| `SENTRY_ENVIRONMENT` | Нет | `development` / `staging` / `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Нет | Доля трейсов 0.0–1.0 (по умолчанию 0.1) |
| `GLITCHTIP_SECRET_KEY` | Да (для GlitchTip) | Секретный ключ >= 50 символов |
| `GLITCHTIP_EMAIL_URL` | Нет | URL email-провайдера. По умолчанию `consolemail://` |
| `GLITCHTIP_DOMAIN` | Нет | Публичный URL GlitchTip для ссылок в алертах |

## Разница GlitchTip vs Sentry.io

| | GlitchTip (self-hosted) | Sentry.io (cloud) |
|---|---|---|
| Стоимость | Бесплатно | Платно от $26/мес |
| Данные | Остаются в вашей инфраструктуре | Уходят в облако |
| Настройка | Нужен docker-compose | Только DSN |
| Функциональность | Базовая | Полная (performance, replays, AI) |

Пакет `@metrix/error-tracker` работает с обоими вариантами — достаточно сменить DSN.

## Структура файлов

```
apps/bot/packages/error-tracker/
  src/
    config.ts     ← чтение env переменных
    index.ts      ← публичный API пакета
    tracker.ts    ← ErrorTracker + errorTracker синглтон
    types.ts      ← типы RequestContext, ErrorExtras, ErrorTrackerConfig
  .env.example    ← пример env переменных пакета
  USAGE.md        ← инструкция подключения
  package.json
  tsconfig.json
```
