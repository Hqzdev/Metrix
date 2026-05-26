# Distributed Tracing (OpenTelemetry)

## Зачем

Когда запрос проходит через `bot-gateway → booking-service → calendar-service → notification-service`, метрики Prometheus показывают "что-то медленно на booking-service". Трейсинг показывает конкретный запрос: "вот этот запрос от пользователя 123456 завис на 800ms в строке `prisma.booking.findUnique` — локнуло Redis".

Без трейсинга production debugging в микросервисах — гадание по логам.

## Стек

| Компонент              | Инструмент                         |
|------------------------|------------------------------------|
| Инструментация         | `@opentelemetry/sdk-node` (автоматическая для HTTP) |
| Протокол               | OTLP HTTP (port 4318)              |
| Коллектор + UI         | Jaeger all-in-one                  |
| Propagation            | W3C TraceContext (`traceparent` / `tracestate`) |
| Log correlation        | `traceId` поле в structured logs   |

## Архитектура

```
[bot-gateway]          [booking-service]       [calendar-service]
     │                       │                        │
     │  traceparent header    │  traceparent header    │
     ├──────────────────────▶│───────────────────────▶│
     │                       │                        │
     ▼                       ▼                        ▼
  OTLP HTTP              OTLP HTTP               OTLP HTTP
     │                       │                        │
     └───────────────────────┴────────────────────────┘
                             │
                       [Jaeger :4318]
                             │
                       [Jaeger UI :16686]
                  http://tracing.localhost
```

## Пакет @metrix/tracing

Расположен в `apps/bot/packages/tracing/`. Экспортирует:

```typescript
// Инициализация SDK — вызвать один раз до всех импортов с сетевыми соединениями.
initTracing(config: TracingConfig): Promise<void>

// Получить traceId активного span-а для инъекции в логи.
getActiveTraceId(): string | undefined

// Получить spanId активного span-а.
getActiveSpanContext(): SpanContext | undefined

// Инъекция W3C заголовков в исходящий запрос.
injectTraceContext(headers: Record<string, string>): void

// Извлечение контекста из входящего запроса.
extractTraceContext(req: IncomingMessage): Context

// Re-exports из @opentelemetry/api: trace, context, SpanStatusCode, SpanKind
```

## Подключение к сервису

1. Создать `src/instrumentation.ts`:

```typescript
import { initTracing } from '@metrix/tracing'
await initTracing({ service: 'my-service' })
```

2. Добавить `@metrix/tracing` в `dependencies` сервиса.

3. Обновить скрипты в `package.json`:

```json
"dev":   "tsx --import ./src/instrumentation.ts src/index.ts",
"start": "node --import ./dist/instrumentation.js dist/index.js"
```

4. Добавить в `docker-compose.yml`:

```yaml
environment:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318
  OTEL_TRACES_SAMPLER_ARG: '1.0'
  SERVICE_VERSION: '0.1.0'
```

Пример: `apps/bot/services/booking-service/src/instrumentation.ts`

## Корреляция логов с трейсами

Инъектируй `traceId` в каждую строку лога:

```typescript
import { getActiveTraceId } from '@metrix/tracing'

logger.info({
  message: 'booking created',
  service: 'booking-service',
  traceId: getActiveTraceId(),   // undefined если трейсинг не инициализирован
  bookingId: result.id,
})
```

В Grafana Loki можно написать запрос `{service="booking-service"} | json | traceId="<id>"` и перейти к трейсу в Jaeger.

## Ручные span-ы

Для критичных бизнес-операций создавай span-ы явно:

```typescript
import { trace, SpanStatusCode } from '@metrix/tracing'

const tracer = trace.getTracer('booking-service')

await tracer.startActiveSpan('create-booking', async (span) => {
  span.setAttribute('booking.resourceId', input.resourceId)
  span.setAttribute('booking.slotId', input.slotId)
  try {
    const result = await createBooking(input)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
    span.recordException(err as Error)
    throw err
  } finally {
    span.end()
  }
})
```

## Jaeger UI

Локально: http://tracing.localhost (через Traefik, после `docker compose up`)

Прямой доступ: http://localhost:16686 (если пробросить порт в docker-compose)

## Sampling

По умолчанию `OTEL_TRACES_SAMPLER_ARG=1.0` — трейсится каждый запрос. На production с высокой нагрузкой снизить до `0.1` (10%) или использовать head-based sampling через Jaeger collector.

## Что НЕ трейсится автоматически

- Prisma queries (нужен `@opentelemetry/instrumentation-prisma-client`)
- BullMQ jobs (нужна ручная инструментация)
- Redis команды (нужен `@opentelemetry/instrumentation-ioredis`)

Добавить их можно через `instrumentations` массив в `initTracing` конфиге.
