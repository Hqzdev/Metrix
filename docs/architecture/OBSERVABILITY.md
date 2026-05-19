Observability

Этот документ описывает наблюдаемость Metrix: health checks, readiness checks, metrics и structured logs.

Назначение

Observability нужна, чтобы понять состояние системы без подключения дебаггера и ручного чтения кода.
Сервис должен отвечать не только на вопрос "жив ли процесс", но и на вопрос "можно ли сейчас принимать трафик".

Runtime endpoints

Каждый HTTP-сервис должен иметь три endpoint:

GET /health
GET /ready
GET /metrics

/health

Health check отвечает только за состояние процесса.
Если процесс Node.js запущен и HTTP server отвечает, endpoint возвращает 200.

Формат ответа:

{
  "ok": true
}

/ready

Readiness check отвечает за готовность принимать трафик.
Он проверяет зависимости, без которых сервис не может корректно выполнять работу.

Примеры проверок:

PostgreSQL отвечает на SELECT 1
Redis отвечает на PING
service-specific dependency доступна или имеет fallback

Если хотя бы одна обязательная dependency недоступна, endpoint возвращает 503.

Формат успешного ответа:

{
  "ok": true,
  "checks": {
    "postgres": {
      "ok": true
    },
    "redis": {
      "ok": true
    }
  }
}

Формат ошибки:

{
  "ok": false,
  "checks": {
    "postgres": {
      "ok": false,
      "error": "connection timeout"
    }
  }
}

/metrics

Metrics endpoint отдаёт Prometheus-compatible text format.

Базовые метрики:

metrix_http_requests_total — количество HTTP-запросов
metrix_http_request_duration_ms_bucket — latency bucket
metrix_http_request_duration_ms_count — количество latency observations
metrix_http_request_duration_ms_sum — сумма latency в миллисекундах
metrix_process_uptime_seconds — uptime процесса
metrix_redis_stream_lag — lag Redis Stream consumer group
metrix_telegram_duplicate_updates_total — количество повторных Telegram updates, пропущенных idempotency layer

Labels:

service — имя сервиса
method — HTTP method
route — нормализованный route
status — HTTP status code
stream — имя Redis Stream для queue metrics
group — имя consumer group для queue metrics
mode — polling или webhook для Telegram gateway metrics

Правила route label

Route label не должен содержать бесконечные значения.
Нельзя писать полный URL с bookingId, reportId или query string.

Допустимо:

/health
/ready
/metrics
/bookings
/reports/:id
/locations/:id

Structured logs

Сервисы пишут JSON logs.

Обязательные поля:

service
level
timestamp
message

Желательные поля:

requestId
action
userId
bookingId
latencyMs
statusCode

Правила ошибок

Ошибка сериализуется как объект:

name
message
stack

В пользовательский HTTP-ответ stack не попадает.
Stack допустим только во внутренних логах.

Centralized logs

Базовый collector config лежит в:

monitoring/logging/vector.toml

Он читает Docker logs, парсит JSON message и сохраняет структурированные поля.
В production sink меняется с stdout на Loki, Datadog или другой provider.

Правила:

сервисы продолжают писать JSON в stdout/stderr
collector отвечает только за сбор, парсинг и отправку
requestId и traceparent используются для корреляции
секреты не попадают в log payload

Graceful shutdown

При SIGTERM или SIGINT сервис должен:

1. перестать принимать новые HTTP-запросы
2. дождаться завершения активных запросов
3. закрыть Prisma connection
4. закрыть Redis connection
5. записать shutdown log
6. завершиться с кодом 0

Если graceful shutdown не завершился за timeout, процесс завершается с кодом 1.

Polling shutdown

bot-gateway использует long polling Telegram getUpdates.
При shutdown сервис выставляет stop signal и завершает polling loop после текущего getUpdates.

Правила:

stop signal должен быть установлен до закрытия Redis
после stop signal новые updates не обрабатываются
offset сохраняется только для уже обработанных updates
ошибка polling во время shutdown не логируется как runtime incident

Worker shutdown

worker-service закрывает BullMQ workers перед закрытием Redis и Prisma.

Порядок:

1. закрыть BullMQ workers
2. закрыть RedisBus
3. закрыть Prisma
4. закрыть low-level Redis connection

Worker shutdown использует тот же helper installGracefulShutdown, что и HTTP-сервисы.

Расширение

Добавление новой метрики:

1. выбрать имя с префиксом metrix_
2. выбрать labels с ограниченной cardinality
3. описать метрику в этом документе
4. добавить тест или manual verification command

Queue metrics

Redis Stream consumers должны публиковать lag по consumer group.

Lag показывает количество сообщений, которые consumer group ещё не обработала.
Если lag растёт, worker не успевает или завис на ошибке.

Пример:

metrix_redis_stream_lag{service="analytics-service",stream="stream:booking.created",group="analytics-service"} 3

Правила:

stream и group имеют фиксированный набор значений
нельзя добавлять messageId, bookingId или userId в labels
DLQ stream не должен скрывать ошибку — перенос в DLQ логируется warn-событием

Alert rules для lag, error rate и readiness описаны в ALERTING.md.

Telegram duplicate updates

bot-gateway считает повторы update_id отдельно для polling и webhook mode.

Метрика:

metrix_telegram_duplicate_updates_total{service="bot-gateway",mode="webhook"} 2

Рост метрики сам по себе не ошибка.
Он показывает, что Telegram или network retry доставили update повторно, а Redis idempotency layer корректно его пропустил.

Tracing

Межсервисные HTTP-запросы передают W3C traceparent header.
Если входящий запрос пришёл без traceparent, принимающий сервис создаёт новый traceparent.

Текущий режим — lightweight propagation без collector.
Это даёт совместимый boundary для будущего OpenTelemetry SDK и позволяет добавить traceId/spanId в structured logs без изменения HMAC-контракта.

Правила:

traceparent не входит в HMAC message
requestId остаётся главным ключом replay protection
traceparent нужен для корреляции logs и spans
OpenTelemetry collector подключается отдельной задачей через OTLP exporter

Добавление новой readiness check:

1. проверка должна быть быстрой
2. timeout должен быть меньше timeout load balancer
3. ошибка должна быть безопасной для ответа
4. подробности остаются в structured logs
