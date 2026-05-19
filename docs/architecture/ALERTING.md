Alerting

Этот документ описывает базовые production alerts для Metrix.

Назначение

Metrics полезны только если по ним есть правила реакции.
Alert должен говорить не только что сломалось, но и какой runbook открыть.

Базовые alerts

High error rate:

ошибка: доля 5xx больше 5% за 5 минут
реакция: проверить logs по service и requestId, открыть docs/operations/failed-deploy-rollback.md

High latency:

ошибка: p95 HTTP latency выше SLO за 10 минут
реакция: проверить downstream dependency, PostgreSQL и Redis, открыть docs/operations/SLO.md

Redis stream lag:

ошибка: metrix_redis_stream_lag растёт или держится выше порога
реакция: открыть QUEUES_AND_EVENTS.md и DLQ_REPLAY.md

Readiness failure:

ошибка: /ready возвращает 503
реакция: проверить dependency check, connection strings и provider status, открыть docs/operations/redis-outage.md или docs/operations/db-restore.md

DLQ activity:

ошибка: появились новые сообщения в dlq:* stream
реакция: не replay-ить автоматически, сначала открыть docs/operations/dlq-replay.md

Telegram duplicate updates:

ошибка: metrix_telegram_duplicate_updates_total резко растёт
реакция: проверить webhook/polling delivery, Redis idempotency и Telegram retries

Prometheus rule examples

Файл с базовыми правилами:

monitoring/rules/metrix-alerts.yml

HTTP 5xx rate:

sum(rate(metrix_http_requests_total{status=~"5.."}[5m])) by (service)
/
sum(rate(metrix_http_requests_total[5m])) by (service)
> 0.05

Redis stream lag:

metrix_redis_stream_lag > 100

Telegram duplicate updates:

increase(metrix_telegram_duplicate_updates_total[10m]) > 20

Readiness failure через blackbox или external probe:

probe_success{job="metrix-ready"} == 0

Правила labels

Alert labels должны иметь ограниченную cardinality.
Нельзя добавлять bookingId, userId, invoiceId, messageId или requestId в metric labels.
requestId нужен в logs, а не в Prometheus labels.

Runbook policy

Каждый новый alert должен иметь:

название
условие
impact
первое действие оператора
ссылку на документ или runbook

Расширение

Когда появится Grafana или Alertmanager:

1. поддерживать examples в monitoring/rules/metrix-alerts.yml
2. добавить severity labels
3. добавить routing для critical alerts
4. добавить silence policy для deploy windows
