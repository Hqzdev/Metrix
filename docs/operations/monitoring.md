# Мониторинг: Prometheus + Grafana

## Что это и зачем

Prometheus собирает метрики со всех микросервисов каждые 15 секунд через HTTP-эндпоинт `/metrics`.
Grafana визуализирует эти метрики в дашбордах.

Без мониторинга вы узнаёте о деградации сервиса от пользователей. С мониторингом — видите spike latency или рост error rate до того, как они станут проблемой.

## Как запустить локально

```bash
# Из директории apps/bot
cp .env.example .env
# Задайте GRAFANA_ADMIN_PASSWORD в .env

docker compose up prometheus grafana
```

Grafana доступна на `http://localhost:3010` (логин: `admin`, пароль из `GRAFANA_ADMIN_PASSWORD`).

Prometheus UI доступен внутри docker-сети. Для отладки scrape_configs можно временно пробросить порт:

```bash
docker compose port prometheus 9090
```

## Как это работает

### Prometheus

Конфиг находится в `monitoring/prometheus/prometheus.yml`.

Prometheus опрашивает эндпоинт `/metrics` каждого сервиса раз в 15 секунд (`scrape_interval`).
Данные хранятся 15 дней (`storage.tsdb.retention.time`).

Все сервисы предоставляют метрики через `@metrix/observability`:

```
metrix_process_uptime_seconds{service="booking-service"} 3600
metrix_http_requests_total{service="...",method="POST",route="/bookings",status="200"} 142
metrix_http_request_duration_ms_bucket{service="...",le="100"} 130
metrix_http_request_duration_ms_count{service="..."} 142
metrix_http_request_duration_ms_sum{service="..."} 4521.3
```

### Grafana

Конфигурация хранится в `monitoring/grafana/`:

```
monitoring/grafana/
  provisioning/
    datasources/prometheus.yml   ← автоподключение Prometheus при старте
    dashboards/dashboard.yml     ← путь к папке с JSON-дашбордами
  dashboards/
    metrix-overview.json         ← дашборд "Metrix — Overview"
```

Grafana читает эти файлы при старте и автоматически создаёт источник данных и дашборды.
Ничего настраивать через UI не нужно.

### Дашборд "Metrix — Overview"

Открыть: Grafana → Dashboards → Metrix — Overview.

Панели:

| Панель | Что показывает |
|---|---|
| RPS по сервисам | Запросов в секунду, разбивка по сервисам |
| P95 Latency | 95-й перцентиль задержки ответа в мс |
| Error Rate (5xx) | Доля серверных ошибок от общего числа запросов |
| Process Uptime | Время работы процесса без перезапуска |
| booking-service — запросы по маршрутам | HTTP-запросы с разбивкой по method/route/status |
| booking-service — Latency percentiles | p50 / p95 / p99 latency для booking-service |
| payment-service — RPS по статусам | Запросы к payment-service по HTTP-статусам |
| payment-service — P95 Latency | p95 latency для payment-service |

## Добавить новый сервис в scraping

Откройте `monitoring/prometheus/prometheus.yml` и добавьте секцию:

```yaml
- job_name: my-new-service
  static_configs:
    - targets: ['my-new-service:PORT']
      labels:
        service: my-new-service
```

Перезагрузите конфиг без рестарта контейнера:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Добавить новый дашборд

Создайте JSON-файл в `monitoring/grafana/dashboards/`.
Grafana автоматически подхватит его в течение 30 секунд (`updateIntervalSeconds: 30`).

Экспортировать дашборд из UI: Dashboard → Settings → JSON Model → Copy.

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `GRAFANA_ADMIN_PASSWORD` | Да | Пароль admin-аккаунта Grafana |

## Структура файлов

```
monitoring/
  prometheus/
    prometheus.yml              ← scrape_configs для всех сервисов
  grafana/
    provisioning/
      datasources/
        prometheus.yml          ← автоподключение Prometheus datasource
      dashboards/
        dashboard.yml           ← путь к папке с дашбордами
    dashboards/
      metrix-overview.json      ← дашборд с общим обзором сервисов
```
