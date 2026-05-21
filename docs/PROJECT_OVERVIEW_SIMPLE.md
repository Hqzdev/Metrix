Metrix Simple Technical Report

Этот документ объясняет Metrix максимально простым языком.

Что такое Metrix

Metrix — это система для бронирования офисных ресурсов: переговорок, рабочих мест, залов и других пространств.

Пользователь может:

- открыть сайт;
- открыть Telegram-бота;
- выбрать ресурс;
- выбрать время;
- создать бронь;
- оплатить, если ресурс платный;
- получить уведомление.

Администратор может:

- смотреть брони;
- смотреть аналитику;
- менять ресурсы;
- разбирать ошибки;
- запускать recovery-действия.

Из чего состоит проект

Web-приложение:

- apps/web
- Next.js, React, TypeScript, Tailwind CSS

Telegram bot runtime:

- apps/bot
- набор микросервисов
- PostgreSQL
- Redis
- Docker Compose

Главные сервисы

bot-gateway — входная дверь Telegram-бота.
booking-service — создает и отменяет брони.
payment-service — отвечает за оплату и временные hold слота.
calendar-service — отвечает за календарные подключения.
analytics-service — считает статистику и отчеты.
admin-service — дает оператору безопасные admin-инструменты.
notification-service — отправляет сообщения в Telegram.
worker-service — выполняет фоновые задачи.

Главные технологии

- TypeScript — основной язык.
- Node.js — runtime backend-сервисов.
- Next.js — web-приложение.
- PostgreSQL — главная база данных.
- Prisma — работа с базой.
- Redis — быстрые временные данные, очереди, locks и rate limit.
- Redis Streams — события между сервисами.
- BullMQ — фоновые задачи.
- Docker Compose — локальный запуск инфраструктуры.
- OpenAPI — описание API.
- GitHub Actions — CI.

Как устроена база

В bot runtime база разделена на схемы:

- booking — локации, ресурсы, брони, занятые слоты;
- payment — invoice, hold, PaymentSaga;
- calendar — подключения календарей;
- analytics — отчеты;
- audit — журнал важных действий.

PostgreSQL — источник правды.
Redis не заменяет базу. Redis хранит только временное состояние.

Как сделана безопасность

- внутренние HTTP-запросы подписываются HMAC;
- повторные запросы ловятся через replay protection;
- Telegram user id подписывается;
- OAuth state подписывается;
- Google refresh tokens шифруются;
- admin-действия ограничены RBAC;
- важные действия пишутся в audit log;
- PostgreSQL и Redis не открыты наружу.

Что уже проверено

- tests passed;
- typecheck passed;
- build passed;
- OpenAPI validation passed;
- Docker Compose runtime поднимался;
- health/readiness checks работали;
- restore drill выполнялся;
- Redis down и analytics down drills выполнялись;
- DLQ replay проверялся.

Что еще усилить

- реальные load tests с p95/p99;
- реальные Grafana/Prometheus/log screenshots;
- полный payment idempotency drill через настоящий invoice flow.
