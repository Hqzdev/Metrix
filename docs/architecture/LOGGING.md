# Structured Logging

## Зачем

Metrix состоит из 9 микросервисов. При инциденте недостаточно увидеть строку `failed` в одном контейнере — нужно найти все события по одному пользователю, брони, платежу или `requestId` **во всех сервисах** за нужный промежуток времени.

Поэтому каждый сервис пишет логи как JSON (одна запись — одна строка), Vector собирает их из Docker, Loki хранит и индексирует, Grafana позволяет делать запросы. А `traceId` связывает лог с трейсом в Jaeger — без ручного прокидывания контекста.

---

## Стек

```
[Сервис]                [Инфраструктура]              [Запросы]
@metrix/logger          Vector → Loki                 Grafana Explore (LogQL)
  │                         │        │                      │
  └─ JSON в stdout/stderr ──┘        └── хранение 30 дней ─┘
           │
           └─ traceId/spanId из OTel ── Jaeger (переход по клику)
```

| Слой               | Инструмент                            | Где настроено                                  |
|--------------------|---------------------------------------|------------------------------------------------|
| Structured logger  | `@metrix/logger`                      | `apps/bot/packages/logger/`                    |
| Log shipping       | Vector 0.42                           | `monitoring/logging/vector.toml`               |
| Storage / query    | Grafana Loki 3.3                      | `monitoring/logging/loki.yml`                  |
| Visualization      | Grafana Explore                       | `monitoring/grafana/provisioning/datasources/` |
| Trace correlation  | OpenTelemetry API + Jaeger            | `apps/bot/packages/tracing/`                   |

---

## Формат записи

Каждая строка лога — валидный JSON с гарантированными полями:

```json
{
  "message": "booking created",
  "requestId": "req_abc123",
  "bookingId": "clx9f...",
  "userId": "tg_456789",
  "level": "info",
  "timestamp": "2026-05-25T10:30:00.123Z",
  "service": "booking-service",
  "env": "production",
  "hostname": "booking-service-7d9c",
  "pid": 1,
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7"
}
```

### Гарантированные поля

| Поле        | Откуда                               | Для чего                                         |
|-------------|--------------------------------------|--------------------------------------------------|
| `level`     | Явно при вызове `.info/.warn/.error` | Фильтрация в Loki по уровню                      |
| `timestamp` | `new Date().toISOString()`           | Сортировка и временные диапазоны в Grafana       |
| `service`   | Аргумент `createLogger('...')`       | Основной Loki label — `{service="..."}`          |
| `env`       | `NODE_ENV` env var                   | Разделение staging / production в запросах       |
| `hostname`  | `os.hostname()`                      | Имя контейнера — помогает при multi-replica      |
| `pid`       | `process.pid`                        | PID процесса — для отладки краш-рестартов        |

### Опциональные поля корреляции

| Поле       | Откуда                                          | Для чего                                        |
|------------|-------------------------------------------------|-------------------------------------------------|
| `traceId`  | Активный OTel span (автоматически)              | Переход лог → трейс в Jaeger по клику в Grafana |
| `spanId`   | Активный OTel span (автоматически)              | Точный span внутри трейса                       |
| `requestId`| Передаёт сервис                                 | Все логи одного HTTP-запроса                    |
| `userId`   | Передаёт сервис                                 | Все логи одного пользователя                    |
| `error`    | Автоматически сериализуется из `Error` instance | Стек и причина исключения                       |

---

## Пакет @metrix/logger

Расположен в `apps/bot/packages/logger/`. Три файла составляют ядро:

```
src/
  index.ts      — публичный API: экспортирует createLogger()
  logger.ts     — реализация write(), createLogger()
  context.ts    — processContext (env/hostname/pid) и getOtelContext() (traceId/spanId)
  serialize.ts  — безопасная сериализация Error → JSON
  types.ts      — ServiceLogger, LogInput, LogBase, SerializedError
```

`getOtelContext()` использует `@opentelemetry/api` напрямую — это безопасно без инициализированного SDK: если трейсинг не запущен, `trace.getActiveSpan()` вернёт `undefined` и поля просто не появятся в логе.

---

## Использование в сервисе

### logger.ts (4 строки вместо 80)

```typescript
import { createLogger } from '@metrix/logger'

export const logger = createLogger('booking-service')
export type BookingServiceLogger = typeof logger
```

### Логирование событий

```typescript
// Информационное событие
logger.info({
  message: 'booking created',
  requestId,
  bookingId: result.id,
  userId: input.telegramUserId,
})

// Предупреждение — что-то нештатное, но не критичное
logger.warn({
  message: 'slot lock expired, retrying',
  requestId,
  resourceId: input.resourceId,
  attempt: retryCount,
})

// Ошибка — Error сериализуется автоматически
logger.error({
  message: 'failed to create booking',
  requestId,
  error,  // instanceof Error → { message, name, stack, cause? }
})
```

### traceId — ничего делать не нужно

`traceId` и `spanId` инъектируются автоматически из активного OpenTelemetry span. Если сервис подключил `@metrix/tracing` (через `--import ./instrumentation.ts`), поля появятся в каждом логе внутри обработанного HTTP-запроса.

---

## Vector pipeline

`monitoring/logging/vector.toml`:

```
Docker stdout/stderr
  → parse_json      парсим JSON строку в поля
  → add_service_meta  гарантируем service / level / env
  → loki            отправляем в Loki с labels {service, level, env}
  → stdout          дублируем в консоль (для docker compose logs -f)
```

**Loki labels** (низкокардинальные — небольшой набор значений):
- `service` — имя сервиса
- `level` — `info | warn | error`
- `env` — `development | staging | production`

**Не labels** (высококардинальные — в JSON body):
- `traceId`, `spanId`, `requestId`, `userId`, `bookingId` и все бизнес-поля

---

## LogQL запросы в Grafana

Открыть: Grafana → Explore → datasource: Loki

```logql
# Все ошибки одного сервиса
{service="booking-service", level="error"}

# Все логи связанные с одним traceId (переход из Jaeger)
{env="production"} | json | traceId="4bf92f3577b34da6a3ce929d0e0e4736"

# Все события одного пользователя по всем сервисам
{env="production"} | json | userId="tg_456789"

# Конкретный HTTP-запрос по всем сервисам
{env="production"} | json | requestId="req_abc123"

# Ошибки в payment и booking за последние 15 минут
{service=~"payment-service|booking-service", level="error"} | json
```

### Log-trace correlation

В Grafana настроен derived field: если лог содержит `traceId`, рядом появляется кнопка перехода в Jaeger. Конфиг в `monitoring/grafana/provisioning/datasources/loki.yml`.

---

## Правила

- **Не использовать `console.log`** в коде сервисов — только `logger.info/warn/error`.
- **Не логировать секреты**: refresh tokens, card data, provider tokens, пароли.
- **Ошибки → `logger.error`**, предупреждения → `logger.warn`. `logger.info` для нормальных бизнес-событий.
- **Structured log ≠ Audit log**: для административных и платежных действий важные события дублируются в persistent `AuditLog` через `@metrix/audit-log`.
- `requestId` передавать через все функции в цепочке обработки запроса.

---

## Тесты

```bash
npm run test:unit -- tests/unit/logger/logger.test.ts
```

`tests/unit/logger/logger.test.ts` проверяет:
- Одна JSON-строка в stdout при `.info()`
- Все обязательные поля присутствуют (`level`, `service`, `timestamp`, `env`, `hostname`, `pid`)
- `.error()` пишет в stderr, а не stdout
- `Error` корректно сериализуется в `{ message, name, stack }`

---

## Миграция

До внедрения `@metrix/logger` каждый из 9 сервисов содержал идентичный copy-paste логгер (~80 строк). После — 4 строки на сервис, единое поведение и автоматические `traceId`/`spanId`.

Сервисы, использующие `@metrix/logger`:
`booking-service`, `bot-gateway`, `payment-service`, `calendar-service`,
`analytics-service`, `admin-service`, `notification-service`, `worker-service`, `security-service`.
