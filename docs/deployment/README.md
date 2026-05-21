Deployment

Этот документ объясняет, как запускать Metrix.

Локальный запуск bot runtime

Основной runtime находится в apps/bot.

Команда:

docker compose -f apps/bot/docker-compose.yml up --build -d

Что поднимается

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

Что проверить после запуска

docker compose -f apps/bot/docker-compose.yml ps
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl http://127.0.0.1:3000/metrics

Если что-то не работает

1. Посмотреть docker compose ps.
2. Посмотреть logs нужного сервиса.
3. Проверить PostgreSQL.
4. Проверить Redis.
5. Проверить env secrets.

Важно

PostgreSQL, Redis и внутренние сервисы не должны быть открыты наружу.
