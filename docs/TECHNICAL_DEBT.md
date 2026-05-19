Technical Debt

Этот документ фиксирует короткий список технического долга, который влияет на production readiness.
Он не заменяет issue tracker, но даёт обзор owner, risk, mitigation и due date.

Правила

Debt item должен иметь owner.
Debt item должен иметь риск.
Debt item должен иметь mitigation.
Due date может быть кварталом, если точной даты нет.

Таблица

| Item | Owner | Risk | Mitigation | Due date | Status |
| --- | --- | --- | --- | --- | --- |
| Real observability screenshots | Platform | Monitoring readiness нельзя доказать без Prometheus/Grafana evidence. | Поднять monitoring stack и заполнить docs/testing/screenshots. | 2026-Q2 | planned |
| Restore drill evidence | Platform | Backup может оказаться невосстановимым. | Выполнить pg_restore в clean database и заполнить RESTORE_DRILL_EVIDENCE.md. | 2026-Q2 | evidence pending |
| Incident simulation | Platform | Runbooks могут не сработать под реальным отказом. | Провести analytics down, Redis down, payment retry и DLQ replay drills. | 2026-Q2 | planned |
| Error code rollout | API | Клиенты парсят нестабильные text errors. | Добавить `{ error, code }`, обновить OpenAPI и contract tests. | 2026-Q2 | in progress |
| Load testing evidence | Platform | Нет p50/p95/p99 и error rate под нагрузкой. | Добавить k6/autocannon scripts и сохранить результаты. | 2026-Q2 | planned |
| OpenTelemetry tracing | Platform | Межсервисный flow сложно расследовать по одному request. | Подключить OTEL SDK и collector после стабилизации logs. | 2026-Q3 | planned |
| Browser operator UI | Product Engineering | DLQ/payment recovery доступны только как backend endpoints. | Добавить admin UI поверх existing endpoints. | 2026-Q3 | planned |

Правило закрытия

Debt item закрывается только после изменения кода или evidence документа.
Если риск принят без исправления, нужно добавить ADR или incident review note.

Связанные документы

docs/architecture/PRODUCTION_READINESS.md
docs/testing/PRODUCTION_READINESS_TEST_REPORT.md
docs/testing/RESTORE_DRILL_EVIDENCE.md
docs/testing/INCIDENT_DRILL_EVIDENCE.md
