SLO

Этот документ описывает service level objectives для Metrix.
Он задаёт availability, latency, error budget и alert thresholds для production readiness.

Назначение

SLO нужен, чтобы alert был связан с пользовательским impact, а не только с технической метрикой.
SLA для внешних клиентов не объявляется, пока нет production договора и публичного статуса сервиса.

Service scope

Core flow:

bot-gateway
booking-service
payment-service
calendar-service
admin-service
PostgreSQL
Redis

Non-core flow:

analytics-service
notification-service
worker-service
report export

Availability SLO

| Scope | SLO | Measurement | Notes |
| --- | --- | --- | --- |
| Core booking API | 99.5% monthly | successful `/ready` probes and non-5xx HTTP responses | учебный production profile |
| Telegram bot entrypoint | 99.5% monthly | bot-gateway `/ready` and update handling success | зависит от Telegram API availability |
| Payment recovery endpoints | 99.5% monthly | admin/payment service readiness and non-5xx responses | ручное восстановление должно быть доступно |
| Analytics/reporting | 99.0% monthly | analytics-service readiness and report job success | не должен блокировать booking core |

Latency SLO

| Endpoint class | Target | Window |
| --- | --- | --- |
| Health and readiness | p95 < 300 ms | 10 minutes |
| Internal read endpoints | p95 < 500 ms | 10 minutes |
| Internal write endpoints | p95 < 1000 ms | 10 minutes |
| Booking create | p95 < 1500 ms | 10 minutes |
| Payment callback handling | p95 < 1500 ms | 10 minutes |
| Admin recovery actions | p95 < 2000 ms | 10 minutes |

Error budget

Monthly availability target:

99.5%

Monthly error budget:

0.5%

30-day budget approximation:

216 minutes unavailable per 30 days

Burn policy:

если 25% monthly budget сгорает за 24 часа, остановить risky deploys
если 50% monthly budget сгорает за 7 дней, открыть incident review
если 100% monthly budget сгорел, freeze на feature deploys до mitigation

Alert thresholds

| Alert | Threshold | Duration | Severity | Runbook |
| --- | --- | --- | --- | --- |
| High HTTP error rate | 5xx > 5% | 5 minutes | warning | docs/operations/failed-deploy-rollback.md |
| High latency | p95 выше SLO | 10 minutes | warning | docs/operations/redis-outage.md или DB runbook |
| Readiness failure | `/ready` unhealthy | 2 minutes | critical | docs/operations/redis-outage.md или docs/operations/db-restore.md |
| Redis stream lag | `metrix_redis_stream_lag > 100` | 10 minutes | warning | docs/architecture/RETRY_STRATEGY.md |
| DLQ activity | new `dlq:*` messages | immediate | warning | docs/operations/dlq-replay.md |
| Telegram duplicate updates | increase > 20 | 10 minutes | info | docs/architecture/SECURITY.md |

Measurement rules

5xx errors count against availability.
4xx validation errors do not count against availability.
Rate-limited requests do not count against availability unless caused by system bug.
Dependency outage counts against Metrix SLO if Metrix cannot provide safe degraded behavior.
Manual maintenance windows must be declared before they are excluded.

Review cadence

Review SLO monthly.
Update SLO after real traffic and load testing evidence.
Do not lower SLO to hide incidents; document residual risk instead.

Связанные документы

docs/architecture/ALERTING.md
docs/architecture/OBSERVABILITY.md
docs/testing/load/README.md
docs/operations/failure-scenarios.md
