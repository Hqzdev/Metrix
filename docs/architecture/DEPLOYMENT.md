# Deployment

Этот документ описывает порядок запуска Metrix runtime и минимальный checklist
для deploy. Подробные runbooks лежат в `docs/operations/`.

## Runtime

| Группа | Компоненты |
| --- | --- |
| Data | PostgreSQL, PgBouncer, Redis |
| Bot services | bot-gateway, booking-service, calendar-service, payment-service |
| Backoffice | analytics-service, admin-service |
| Async | notification-service, worker-service |
| Edge/observability | Traefik, metrics, logs, error tracking |

## Сетевое правило

Наружу не должны быть опубликованы PostgreSQL, Redis, PgBouncer и внутренние
service ports. Публичные входы ограничиваются Telegram webhook/gateway, web
frontend и явно разрешенными admin endpoints.

## Порядок старта

1. PostgreSQL.
2. Redis.
3. PgBouncer.
4. `db-init` или миграции.
5. Доменные сервисы: booking, calendar, payment.
6. Async сервисы: notification, worker.
7. Admin/analytics.
8. bot-gateway и публичный edge.

## Pre-deploy checklist

- [ ] Образы собраны из ожидаемого commit SHA.
- [ ] Миграции проверены на staging или локальной копии.
- [ ] Secrets заданы для каждого сервиса по принципу least privilege.
- [ ] Contract tests и typecheck прошли для измененной области.
- [ ] Rollback image/tag известен команде.

## Post-deploy checklist

- [ ] `docker compose ps` или orchestrator status показывает healthy сервисы.
- [ ] `/health` и `/ready` доступны для публичных и внутренних сервисов.
- [ ] `/metrics` собирается observability stack.
- [ ] Логи не показывают startup error, auth mismatch или DB reconnect loop.
- [ ] Booking create/cancel smoke test прошел.
- [ ] Payment recovery queue не растет неожиданно.

## Rollback

Если deploy сломан:

1. Остановить rollout.
2. Вернуть предыдущий image/tag.
3. Проверить `/ready` и основные smoke tests.
4. Проверить payment saga и booking states, которые могли попасть в середину flow.
5. Записать incident notes и follow-up владельца.
