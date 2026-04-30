Документация проекта

Вся техническая документация по коду находится в этой папке.
Каждый блок системы — отдельная подпапка.

Структура

architecture/ — системная архитектура, модули, база данных, API, очереди, деплой
telegram-bot/ — блоки Telegram-бота: bot, commands, lib, services, reports, calendar, operations
api/ — блоки backend API: аналитика, данные, очереди и realtime
telegram-bot-diagrams/ — диаграммы потоков Telegram-бота

Архитектура

- [Системный обзор](./architecture/SYSTEM_OVERVIEW.md)
- [Модули системы](./architecture/MODULES.md)
- [Структура проекта](./architecture/FILE_STRUCTURE.md)
- [API-контракты](./architecture/API_CONTRACTS.md)
- [База данных](./architecture/DATABASE_SCHEMA.md)
- [Очереди и события](./architecture/QUEUES_AND_EVENTS.md)
- [Интеграции](./architecture/INTEGRATIONS.md)
- [Инфраструктура и деплой](./architecture/DEPLOYMENT.md)
- [Аналитика](./architecture/ANALYTICS.md)

Telegram-бот

- [Bot-блок](./telegram-bot/bot-block.md)
- [Commands-блок](./telegram-bot/commands-block.md)
- [Lib-блок](./telegram-bot/lib-block.md)
- [Services-блок](./telegram-bot/services-block.md)
- [Reports-блок](./telegram-bot/reports-block.md)
- [Интеграции с календарями](./telegram-bot/calendar-integrations.md)
- [Operations и безопасность](./telegram-bot/operations.md)

API

- [Аналитика](./api/analytics.md)
- [Backend и данные](./api/backend-data.md)
- [Очереди и realtime](./api/queues-realtime.md)
