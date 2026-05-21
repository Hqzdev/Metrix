Technical Debt

Этот документ хранит известные долги проекта.
Долг — это не ошибка. Это место, которое работает сейчас, но его нужно усилить позже.

Как читать таблицу

- Owner — кто отвечает.
- Risk — что может пойти не так.
- Mitigation — что сделать, чтобы риск уменьшить.
- Due date — когда желательно закрыть.
- Status — текущее состояние.

| Debt | Owner | Risk | Mitigation | Due date | Status |
| --- | --- | --- | --- | --- | --- |
| Load testing evidence | Platform | Неизвестно, как система ведет себя под нагрузкой. | Запустить k6/autocannon, сохранить p50/p95/p99/error rate. | 2026-Q2 | planned |
| Observability screenshots | Platform | Есть endpoints и config, но нет UI evidence. | Снять Prometheus/Grafana/log screenshots. | 2026-Q2 | planned |
| Payment retry full drill | Payments | Synthetic retry не доказывает полный invoice -> booking flow. | Повторить drill через настоящий invoice flow. | 2026-Q2 | partial |
| Contract tests | API | Внешние клиенты могут сломаться при изменении DTO. | Расширить contract tests для публичных клиентов. | 2026-Q2 | partial |
| Monitoring UI stack | Platform | Локально проверены endpoints, но не полный dashboard. | Поднять monitoring stack и сохранить evidence. | 2026-Q2 | planned |

Правило

Если долг влияет на безопасность, оплату или данные пользователя, он получает приоритет выше обычного refactor.
