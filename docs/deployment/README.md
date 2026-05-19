Deployment Runbook

Этот документ описывает практический запуск Metrix: локальную среду, Docker, переменные окружения, порядок старта сервисов и проверки после запуска.

Назначение

Документ нужен, чтобы разработчик мог поднять систему без устных пояснений.
Архитектурные принципы деплоя описаны в docs/architecture/DEPLOYMENT.md.
Этот файл фиксирует операционный порядок действий.

Состав окружения

apps/web — Next.js web-интерфейс
apps/bot/bot-gateway — публичная точка входа Telegram-бота
apps/bot/services/booking-service — бронирования и слоты
apps/bot/services/calendar-service — календарные интеграции
apps/bot/services/payment-service — оплаты и временные hold
apps/bot/services/analytics-service — отчёты и агрегаты
apps/bot/services/admin-service — админские операции и audit log
apps/bot/services/notification-service — уведомления
apps/bot/services/worker-service — фоновые задачи
PostgreSQL — основная база данных
Redis — очереди, rate limit, locks и replay protection
PgBouncer — connection pooling для runtime-сервисов

Локальный запуск

1. Подготовить env-файлы.

```
cp apps/bot/.env.example apps/bot/.env
cp apps/bot/services/booking-service/.env.example apps/bot/services/booking-service/.env
cp apps/bot/services/calendar-service/.env.example apps/bot/services/calendar-service/.env
cp apps/bot/services/payment-service/.env.example apps/bot/services/payment-service/.env
cp apps/bot/services/analytics-service/.env.example apps/bot/services/analytics-service/.env
cp apps/bot/services/admin-service/.env.example apps/bot/services/admin-service/.env
cp apps/bot/services/notification-service/.env.example apps/bot/services/notification-service/.env
```

2. Запустить инфраструктуру и сервисы.

```
cd apps/bot
docker compose up --build
```

3. Проверить состояние сервисов.

```
docker compose ps
curl http://localhost:3000/health
```

Startup sequence

1. PostgreSQL
2. Redis
3. PgBouncer
4. db-init или миграции
5. booking-service
6. calendar-service
7. payment-service
8. analytics-service
9. admin-service
10. notification-service
11. worker-service
12. bot-gateway

Порядок важен, потому что bot-gateway зависит от внутренних HTTP-сервисов, а сервисы зависят от PostgreSQL и Redis.

Ports

bot-gateway — 3000, публичный порт
booking-service — 3001, internal network
calendar-service — 3002, internal network
payment-service — 3003, internal network
analytics-service — 3005, internal network
admin-service — 3006, internal network
PostgreSQL — internal network
PgBouncer — internal network
Redis — internal network

Health checks

Минимальная проверка после запуска:

GET /health — процесс жив
GET /ready — сервис готов принимать запросы
GET /metrics — технические метрики

Проверки перед demo

Telegram bot отвечает на /start.
Создание бронирования проходит до выбора слота.
Повторный Telegram update не создаёт дубль.
Rate limit срабатывает на частые действия.
Audit log пишет forbidden/admin/security events.
Payment hold истекает и освобождает слот.
Calendar OAuth callback не принимает неподписанный state.

Production notes

Production-секреты хранятся только в provider secrets.
DATABASE_URL runtime-сервисов указывает на pooler.
Миграции используют прямое подключение к PostgreSQL.
Webhook mode требует публичный HTTPS URL.
PostgreSQL, Redis и внутренние сервисы не публикуются наружу.

Связанные документы

docs/architecture/DEPLOYMENT.md
docs/architecture/OBSERVABILITY.md
docs/architecture/BACKUP_STRATEGY.md
docs/architecture/PRODUCTION_READINESS.md
