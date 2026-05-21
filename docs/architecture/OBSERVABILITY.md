Observability

Этот документ объясняет, как понять, что система жива или сломалась.

Главная идея

Нельзя чинить то, чего не видно.
Поэтому сервисы должны отдавать health, readiness, metrics и понятные логи.

Health

/health отвечает на вопрос:

сервисный процесс жив?

Readiness

/ready отвечает на вопрос:

сервис готов выполнять работу?

Если Redis или PostgreSQL недоступны, ready должен показать проблему.

Metrics

/metrics отдает данные в формате Prometheus.

Примеры:

- uptime процесса;
- количество HTTP-запросов;
- длительность HTTP-запросов;
- Redis stream lag.

Logs

Логи пишутся как JSON.
Так их проще искать и фильтровать.

Что смотреть при проблеме

1. docker compose ps.
2. /ready нужного сервиса.
3. /metrics.
4. logs сервиса.
5. Redis stream lag.
6. AuditLog, если действие было важным.

Что уже проверялось

Локально проверялись:

- docker compose up;
- healthchecks;
- /ready;
- /metrics;
- Redis down drill;
- analytics down drill.

Что еще нужно

Нужны реальные screenshots из:

- Prometheus;
- Grafana;
- logs viewer;
- metrics endpoints.
