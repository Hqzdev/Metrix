Operations

Этот раздел содержит operator runbooks для production incident response.

Документы

- [Failure scenarios](./failure-scenarios.md) — Redis down, PostgreSQL down, Telegram down и duplicate payment callback.
- [SLO](./SLO.md) — availability, p95 latency, error budget и alert thresholds.
- [Redis outage](./redis-outage.md) — действия при отказе Redis.
- [DB restore](./db-restore.md) — восстановление PostgreSQL из backup.
- [DLQ replay](./dlq-replay.md) — безопасный replay сообщений из dead letter queue.
- [Failed deploy rollback](./failed-deploy-rollback.md) — rollback после неуспешного deploy.

Правило расширения

Каждый новый production alert должен ссылаться на runbook в этом разделе или на конкретный архитектурный документ с процедурой восстановления.
