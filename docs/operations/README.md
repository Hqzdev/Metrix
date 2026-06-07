Operations

Этот раздел объясняет, что делать при сбоях.

Runbook — это инструкция на плохой день.
Она должна быть короткой и понятной.

Документы

- redis-outage.md — Redis недоступен.
- db-restore.md — восстановление базы.
- dlq-replay.md — replay сообщения из DLQ.
- ci-docker-builds.md — сбои Docker builds в CI.
- failed-deploy-rollback.md — откат сломанного deploy.
- failure-scenarios.md — список типовых отказов.
- SLO.md — цели надежности.

Главное правило

Сначала остановить вред, потом чинить красиво.
Например, если Redis упал, нельзя обходить replay protection вручную.
