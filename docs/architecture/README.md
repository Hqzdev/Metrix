Архитектурный индекс

Эта папка описывает, как будет устроен `Smart Booking System` на уровне модулей, файловой структуры, API, БД, очередей, интеграций и инфраструктуры.

Что лежит в этой папке

- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) — общий обзор системы и её границ
- [MODULES.md](./MODULES.md) — доменные модули и их ответственность
- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) — структура каталогов и список основных файлов проекта
- [API_CONTRACTS.md](./API_CONTRACTS.md) — будущие API-маршруты и контракты
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — сущности БД и связи между ними
- [QUEUES_AND_EVENTS.md](./QUEUES_AND_EVENTS.md) — фоновые задачи, события и асинхронные процессы
- [INTEGRATIONS.md](./INTEGRATIONS.md) — Google, Microsoft, Telegram и адаптеры
- [DEPLOYMENT.md](./DEPLOYMENT.md) — окружения, сервисы, деплой и мониторинг

Как читать

1. `SYSTEM_OVERVIEW.md`
2. `MODULES.md`
3. `FILE_STRUCTURE.md`
4. Остальные документы по конкретной технической области

Что появится позже

Когда проект начнёт реализовываться, рядом с этой документацией появятся реальные каталоги:

```txt
src/
prisma/
workers/
apps/
packages/
```

Этот индекс нужен как точка входа, чтобы команда сразу понимала, где искать нужный контекст.
