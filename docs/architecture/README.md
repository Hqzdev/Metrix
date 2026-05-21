Architecture Docs

Этот раздел объясняет архитектуру Metrix.

Главная мысль

Архитектура — это не "красивые схемы".
Это ответ на вопросы:

- из каких частей состоит система;
- кто за что отвечает;
- как данные проходят через сервисы;
- что происходит при ошибке;
- как система защищает деньги, брони и пользователей.

Самые важные документы

- SYSTEM_OVERVIEW.md — общий обзор.
- SECURITY.md — безопасность.
- DATABASE_SCHEMA.md — база данных.
- QUEUES_AND_EVENTS.md — события и очереди.
- PAYMENTS_AND_HOLDS.md — оплата и временное удержание слота.
- OBSERVABILITY.md — health, ready, metrics и logs.
- PRODUCTION_READINESS.md — общий production checklist.

Как читать

Если ты новый в проекте:

1. Прочитай PROJECT_OVERVIEW_SIMPLE.md.
2. Потом SYSTEM_OVERVIEW.md.
3. Потом DATABASE_SCHEMA.md.
4. Потом SECURITY.md.
5. Потом только углубляйся в остальные файлы.
