Telegram Bot services

Этот документ описывает сервисы в apps/bot.
Telegram-бот в проекте — это не один большой файл, а набор маленьких сервисов.

Назначение

Каждый сервис отвечает за свою часть работы.
Так проще понимать код, запускать систему и менять одну часть, не ломая остальные.

Главные сервисы

bot-gateway

Общается с Telegram.
Принимает команды, кнопки, платежные события и передаёт задачи другим сервисам.

bot-gateway не хранит бронирования в базе.
Он только ведёт диалог с пользователем.

booking-service

Отвечает за бронирования.

Он знает:

- какие есть локации
- какие есть комнаты или ресурсы
- какие слоты свободны
- какие бронирования есть у пользователя
- можно ли отменить бронь

payment-service

Отвечает за оплату.

Он создаёт счёт, принимает результат оплаты и связывает оплату с бронью.
Для Telegram Payments используется provider token, например YooKassa.

calendar-service

Отвечает за подключение календаря.

Сейчас основной сценарий — Google Calendar:

- создать ссылку на подключение
- принять OAuth callback
- сохранить подключение
- отключить календарь

analytics-service

Отвечает за аналитику и статистику.
bot-gateway обращается к нему, когда администратор открывает /stats.

admin-service

Отвечает за административные операции.
Например, за работу с аудитом и внутренними admin endpoints.

worker-service

Выполняет фоновые задачи.

Например:

- напоминания
- обновление календаря
- генерация отчётов

notification-service

Отправляет уведомления в Telegram, когда событие пришло не напрямую от пользователя, а из очереди или другого сервиса.

Как сервисы общаются

bot-gateway ходит во внутренние сервисы через ServicesClient.
Код находится в apps/bot/services/bot-gateway/src/services-client.ts.

Для событий и фоновых задач используется Redis и BullMQ.
Redis также хранит состояние пользователя и обработанные Telegram update.

База данных

Основная база — PostgreSQL.
К ней подключаются сервисы, которым нужны постоянные данные.

Для работы с базой используется Prisma.
Схема базы для bot-приложения находится в apps/bot/prisma/schema.prisma.

Локальный запуск

Локальная инфраструктура описана в apps/bot/docker-compose.yml.

В docker-compose поднимаются:

- PostgreSQL
- PgBouncer
- Redis
- db-init
- booking-service
- calendar-service
- payment-service
- notification-service
- worker-service
- analytics-service
- admin-service
- bot-gateway

Зачем нужен PgBouncer

PgBouncer стоит между сервисами и PostgreSQL.
Он помогает не открывать слишком много соединений к базе.
Для пользователя это невидимая часть системы, но для стабильной работы сервера она важна.

Зачем нужен Redis

Redis используется для быстрых временных данных:

- состояние пользователя в Telegram
- защита от повторной обработки update
- rate limit
- очереди и события

Секреты и доступы

Сервисы не должны получать лишние секреты.
Например, Telegram token нужен bot-gateway и notification-service, но не нужен booking-service.

Внутренние запросы между сервисами подписываются secret-ключами.
Это нужно, чтобы один сервис мог проверить, что запрос пришёл от доверенной части системы.

Где смотреть код

- apps/bot/docker-compose.yml — список сервисов для локального запуска
- apps/bot/Dockerfile.service — общий Dockerfile для сервисов
- apps/bot/services/bot-gateway — вход из Telegram
- apps/bot/services/booking-service — бронирования
- apps/bot/services/payment-service — платежи
- apps/bot/services/calendar-service — календарь
- apps/bot/services/analytics-service — аналитика
- apps/bot/services/admin-service — админские функции
- apps/bot/services/worker-service — фоновые задачи
- apps/bot/services/notification-service — уведомления
- apps/bot/packages — общие внутренние пакеты
