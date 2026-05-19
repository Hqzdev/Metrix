Deployment

Этот документ описывает инфраструктуру проекта: окружения, деплой, конфигурацию сервисов, переменные окружения и наблюдаемость.

Назначение

Документ нужен, чтобы деплой и локальная среда были воспроизводимыми.
Запуск проекта не должен зависеть от устных договорённостей внутри команды.

Что описывает документ

окружения: local, preview, production
где запускается web
где запускается backend
где запускаются workers
где находится PostgreSQL
где находится Redis
как настроены secrets и env
как устроены логирование, мониторинг и health checks

Ожидаемые файлы

.env.example
.env.local
docker-compose.yml
vercel.json
src/shared/config/env.ts
src/shared/config/runtime.ts
scripts/bootstrap-local.sh
scripts/migrate.sh
scripts/seed.sh

Если будет контейнеризация, дополнительно появляются:

Dockerfile
Dockerfile.worker
.dockerignore

Ожидаемые сервисы

web runtime — пользовательский интерфейс
api runtime — backend API
background workers — фоновые задачи
PostgreSQL — основная база данных
PgBouncer — connection pooling для runtime-сервисов
Redis — очереди, cache и locks
monitoring / logging provider — наблюдаемость

Сервисные зависимости

booking-service использует PostgreSQL и Redis.
calendar-service использует PostgreSQL и Redis.
payment-service использует PostgreSQL и Redis.
analytics-service использует PostgreSQL и Redis.
admin-service использует PostgreSQL и Redis.
notification-service использует Redis.
worker-service использует PostgreSQL и Redis.
bot-gateway использует Redis и внутренние HTTP-сервисы.

admin-service подключается к PostgreSQL для persistent audit log.
admin-service запускает audit retention cleanup по AUDIT_RETENTION_DAYS и AUDIT_RETENTION_INTERVAL_MS.

Connection pooling

Runtime-сервисы не должны открывать прямые Prisma connections к PostgreSQL.
В docker-compose они подключаются к PgBouncer:

postgresql://metrix:${POSTGRES_PASSWORD}@pgbouncer:6432/metrix?pgbouncer=true

Правила:

booking-service, calendar-service, payment-service, analytics-service, admin-service и worker-service используют PgBouncer
db-init использует прямое подключение к postgres:5432, потому что миграции и schema push не должны идти через transaction pool
PostgreSQL не пробрасывается на host и доступен только внутри Docker network
PgBouncer не пробрасывается на host и доступен только внутри Docker network
POOL_MODE в compose — transaction

Production provider может заменить встроенный PgBouncer на managed pooler.
Главное правило не меняется: runtime DATABASE_URL должен указывать на pooler, migration DATABASE_URL — на прямую БД.

Telegram delivery mode

bot-gateway поддерживает два режима:

polling — локальный режим по умолчанию
webhook — production-режим для контролируемого scaling

Переменные:

TELEGRAM_MODE=polling или webhook
TELEGRAM_WEBHOOK_URL=https://bot.example.com/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=случайный secret_token

В webhook mode bot-gateway:

1. запускает endpoint POST /telegram/webhook
2. проверяет X-Telegram-Bot-Api-Secret-Token если secret задан
3. регистрирует webhook через Telegram setWebhook
4. обрабатывает update через тот же Bot service layer, что и polling

Webhook URL должен быть внешним HTTPS URL, доступным Telegram.

Окружения

local используется для разработки.
preview используется для проверки веток и pull requests.
production используется для реальных пользователей.

Правила конфигурации

Секреты не хранятся в коде.
.env.example содержит только имена переменных и безопасные примеры.
Production-секреты передаются через provider secrets.
Миграции выполняются перед запуском новой версии.
Workers запускаются отдельно от web runtime.
Сервисы, которые пишут audit log, должны получать DATABASE_URL.

Наблюдаемость

Каждый runtime должен иметь health check.
HTTP runtime должен иметь readiness check отдельно от health check.
HTTP runtime должен отдавать Prometheus-compatible metrics endpoint.
Логи должны быть структурированными.
Ошибки должны попадать в monitoring provider.
Фоновые задачи должны иметь метрики успеха, ошибки и retry.

CI

GitHub Actions workflow находится в .github/workflows/ci.yml.

Минимальные проверки:

Prisma schema validation
API typecheck
unit и integration тесты, которые не требуют поднятого окружения
bot microservices build
web typecheck

Backup

PostgreSQL backup выполняется через scripts/backup-postgres.sh.

Команда:

npm run db:backup

DATABASE_URL обязателен.
BACKUP_DIR опционален и по умолчанию равен backups/postgres.

Backup strategy описана в BACKUP_STRATEGY.md.

Health check отвечает только на вопрос, жив ли процесс.
Readiness check отвечает на вопрос, готов ли сервис принимать трафик.

Минимальные endpoints:

GET /health
GET /ready
GET /metrics

Graceful shutdown

Каждый сервис должен обрабатывать SIGTERM и SIGINT.

При shutdown сервис:

1. останавливает приём новых HTTP-запросов
2. закрывает Prisma connection
3. закрывает Redis connection
4. пишет structured log о завершении
5. завершает процесс без потери активного запроса

bot-gateway при shutdown останавливает Telegram polling loop через stop signal.
worker-service закрывает BullMQ workers через общий installGracefulShutdown helper.

Расширение

Добавление нового сервиса:

1. описать назначение сервиса
2. описать runtime
3. описать env-переменные
4. описать health check
5. описать readiness check
6. описать логи и мониторинг
7. описать graceful shutdown resources

Добавление новой переменной окружения:

1. добавить переменную в .env.example
2. добавить чтение в env.ts
3. добавить валидацию
4. описать переменную в этом документе
