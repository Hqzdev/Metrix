# Observability

Нельзя чинить то, чего не видно. Observability в Metrix построен на трёх столпах — метрики, логи, трейсы — и между ними есть явные связи.

---

## Три столпа

```
Метрики (Prometheus + Grafana)
  "booking-service обрабатывает 200ms на p95"

Логи (Loki + Vector + Grafana)
  "вот конкретные запросы которые занимают 200ms"

Трейсы (OpenTelemetry + Jaeger)
  "вот этот конкретный запрос: он провёл 180ms в prisma.booking.findUnique"
```

Переходы между ними:
- Метрики → Логи: из Grafana dashboard кликнуть «Explore logs» с тем же service и временным диапазоном
- Логи → Трейсы: кликнуть на `traceId` в строке лога — откроется Jaeger
- Трейсы → Логи: скопировать `traceId` из Jaeger, вставить в LogQL запрос

---

## Health и Readiness

**`GET /health`** — процесс жив?

```json
{ "ok": true }
```

**`GET /ready`** — зависимости доступны?

```json
{ "postgres": "ok", "redis": "ok" }
```

503 если хотя бы одна зависимость недоступна. Traefik и docker compose healthcheck используют `/ready` для маршрутизации и рестартов.

---

## Метрики

**`GET /metrics`** — Prometheus exposition format.

Каждый сервис использует `@metrix/observability` (пакет `apps/bot/packages/observability`):

- `metrix_process_uptime_seconds` — аптайм процесса
- `metrix_http_requests_total` — счётчик запросов по `method`, `route`, `status`
- `metrix_http_request_duration_ms` — histogram латентности

Prometheus scrape каждые 15 секунд. Конфиг: `monitoring/prometheus/prometheus.yml`.

Grafana dashboards: `monitoring/grafana/dashboards/`.

---

## Логи

Каждая строка лога — один JSON объект:

```json
{
  "level": "error",
  "timestamp": "2026-05-25T10:30:00.123Z",
  "service": "payment-service",
  "env": "production",
  "hostname": "payment-service-1",
  "pid": 1,
  "message": "payment provider timeout",
  "requestId": "req_abc",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "error": { "name": "Error", "message": "timeout", "stack": "..." }
}
```

Все 9 сервисов используют `@metrix/logger` (`apps/bot/packages/logger`). `traceId` и `spanId` инъектируются автоматически без изменений в бизнес-коде.

**Pipeline**: Docker stdout/stderr → Vector → Loki → Grafana Explore.

Конфиги: `monitoring/logging/vector.toml`, `monitoring/logging/loki.yml`.

Подробно: `docs/architecture/LOGGING.md`.

---

## Трейсы

Каждый HTTP-запрос получает `traceId`. Он проходит через все сервисы в цепочке через W3C `traceparent` заголовок.

Пакет `@metrix/tracing` (`apps/bot/packages/tracing`) инициализирует OTel SDK. Jaeger UI доступен на `http://tracing.localhost`.

Подробно: `docs/architecture/TRACING.md`.

---

## Lokальные URL (docker compose up)

| Инструмент        | URL                          |
|-------------------|------------------------------|
| Grafana           | http://grafana.localhost     |
| Jaeger (трейсы)   | http://tracing.localhost     |
| Traefik dashboard | http://localhost:8080        |
| GlitchTip         | http://errors.localhost      |
| MinIO Console     | http://minio.localhost       |

---

## Алгоритм диагностики инцидента

```
1. docker compose ps
   → все ли сервисы healthy?

2. GET /ready на проблемном сервисе
   → какая зависимость недоступна?

3. Grafana → Loki Explore
   {service="<сервис>", level="error"} | json
   → найти первую ошибку, взять requestId или traceId

4. {env="production"} | json | traceId="<id>"
   → все логи этого запроса по всем сервисам

5. Перейти в Jaeger по traceId
   → найти медленный или ошибочный span

6. GET /metrics на сервисе
   → изменился ли error rate или p95 latency?

7. Если действие важное (платёж, отмена) — проверить AuditLog
```

---

## Что проверялось

- `docker compose up` — все сервисы стартуют и проходят healthcheck
- `/ready` с выключенным Redis — возвращает 503
- `/metrics` — Prometheus успешно scrape-ит все сервисы
- Loki — Vector доставляет логи, Grafana Explore показывает результаты
- Jaeger — трейсы появляются при HTTP-запросах к сервисам с `initTracing()`
- Unit тесты `@metrix/logger` — `npm run test:unit -- tests/unit/logger/logger.test.ts`
