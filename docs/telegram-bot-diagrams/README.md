Telegram Bot Diagrams

Здесь лежат диаграммы для Telegram-бота в формате Mermaid.

Как использовать

1. Открыть draw.io → Insert → Advanced → Mermaid
2. Вставить код из нужного .mmd файла
3. Или открыть на mermaid.live для быстрого просмотра

Список диаграмм

Монолит (оригинальный бот)

- 01-bot-overview.mmd — общий поток работы бота
- 02-booking-flow.mmd — сценарий бронирования
- 03-cancel-reschedule-flow.mmd — отмена и перенос
- 04-reminder-flow.mmd — напоминания
- 05-bot-architecture.mmd — связь бота с API, БД, очередями и интеграциями

Микросервисная архитектура (telegram-bot-ms)

- 06-microservices-architecture.mmd — схема всех 7 сервисов, Redis и PostgreSQL
- 07-db-schema.mmd — ERD: 4 схемы в PostgreSQL (booking, calendar, payment, analytics)
- 08-booking-flow-ms.mmd — полный flow бронирования через микросервисы
- 09-calendar-flow.mmd — подключение / статус / отключение Google Calendar
- 10-cancel-flow-ms.mmd — отмена бронирования через микросервисы
- 11-redis-streams.mmd — карта Redis Streams: publishers, streams, consumers
- 12-service-http-api.mmd — HTTP API всех сервисов и связи с bot-gateway
