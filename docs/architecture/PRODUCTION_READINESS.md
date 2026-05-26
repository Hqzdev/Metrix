Production Readiness

Этот документ объясняет, насколько Metrix готов к production-подходу.

Главная идея

Production readiness — это не только "код запускается".
Это значит:

- система безопасна;
- ошибки видны;
- есть retry;
- есть backup;
- есть инструкции при аварии;
- есть tests и quality gates;
- важные действия можно расследовать.

Что уже есть

- HMAC service-to-service auth.
- Replay protection.
- Signed Telegram user id.
- Redis locks.
- Rate limit.
- PostgreSQL schemas.
- Prisma.
- Redis Streams.
- DLQ.
- AuditLog.
- Health/readiness/metrics.
- Structured JSON logs.
- Loki/Vector log pipeline.
- OpenTelemetry trace correlation fields in logs.
- Docker healthchecks.
- OpenAPI.
- Git hooks.
- CI quality gates.
- Backup strategy.
- Restore drill evidence.
- Incident drill evidence.
- Runbooks.

Что проверено

- npm test.
- npm run typecheck.
- npm run build.
- npm run openapi:validate.
- logger unit tests.
- docker compose config.
- docker compose up.
- /ready.
- /metrics.
- restore drill.
- Redis down drill.
- analytics down drill.
- DLQ replay drill.

Что осталось усилить

- load tests с p50/p95/p99/error rate;
- Prometheus/Grafana/log screenshots;
- полный payment retry через настоящий invoice flow;
- больше external contract tests;
- remote CI evidence.

Как пользоваться документом

Этот файл — не рекламный список.
Если пункт не проверен, его нужно оставить как planned или partial.
Не писать passed без фактической команды, лога или screenshot.
