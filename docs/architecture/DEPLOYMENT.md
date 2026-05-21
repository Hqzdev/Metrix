Deployment

Этот документ объясняет запуск и deploy.

Из чего состоит runtime

- PostgreSQL;
- PgBouncer;
- Redis;
- bot-gateway;
- booking-service;
- calendar-service;
- payment-service;
- analytics-service;
- admin-service;
- notification-service;
- worker-service.

Главное правило сети

Наружу не должны торчать PostgreSQL, Redis и внутренние сервисы.
Публичной точкой входа является bot-gateway.

Порядок старта

1. PostgreSQL.
2. Redis.
3. PgBouncer.
4. db-init/migrations.
5. внутренние сервисы.
6. bot-gateway.

Что проверять после запуска

- docker compose ps;
- /health;
- /ready;
- /metrics;
- logs;
- DB connection;
- Redis connection.

Rollback

Если deploy сломан:

1. остановить rollout;
2. вернуть предыдущий образ;
3. проверить /ready;
4. проверить платежные и booking states;
5. записать incident notes.
