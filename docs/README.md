Documentation

Эта папка объясняет, как устроен Metrix.
Документы написаны для двух типов читателей:

- для человека, который просто хочет понять проект;
- для разработчика, который будет запускать, чинить или развивать систему.

Главная мысль

Metrix — это система бронирования офисных ресурсов.
Пользователь работает через сайт или Telegram-бота.
Внутри есть несколько сервисов, PostgreSQL, Redis, очереди, проверки здоровья, безопасность и инструкции на случай сбоев.

Куда смотреть сначала

- PROJECT_OVERVIEW_SIMPLE.md — самый простой общий обзор.
- REPORT.md — инженерная оценка проекта.
- architecture/SYSTEM_OVERVIEW.md — как части системы связаны между собой.
- architecture/SECURITY.md — как система защищена.
- architecture/DATABASE_SCHEMA.md — как устроена база данных.
- deployment/README.md — как запускать проект.
- operations/README.md — что делать при инцидентах.
- testing/PRODUCTION_READINESS_TEST_REPORT.md — что уже проверяли.

Разделы

architecture/ — архитектура, база, безопасность, очереди, платежи, мониторинг.
api/ — документация про root packages/api. Это не вся bot microservices API.
deployment/ — запуск и окружение.
operations/ — runbooks для аварийных ситуаций.
security/ — краткая security-карта.
testing/ — проверки, evidence и тестовые сценарии.
telegram-bot/ — Telegram-бот простыми блоками.
telegram-bot-diagrams/ — Mermaid-диаграммы.
decisions/ — ADR, то есть записи важных архитектурных решений.
openapi/ — OpenAPI спецификация публичного bot API.

Важно

В проекте есть две backend-ветки:

- packages/api — root API-блок, который можно подключать к web/API runtime;
- apps/bot — Telegram bot microservices runtime.

Не путать их. Production-grade bot runtime живет в apps/bot.
