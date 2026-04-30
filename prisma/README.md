Prisma

Этот документ описывает папку prisma: схему базы данных, миграции и seed-данные.

Назначение

Папка prisma хранит структуру PostgreSQL для backend-блока.
Она не содержит бизнес-логику, обработчики API или Telegram-код.

В этом слое не должно находиться обращение к process.env кроме команд запуска Prisma.

Структура файлов

schema.prisma — PostgreSQL-схема для пользователей, ресурсов, слотов, броней и календарей
migrations/20260430120000_init/migration.sql — первая SQL-миграция
seed.ts — локальные данные для разработки

Команды

Команды запускаются из корня проекта:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Переменные окружения

Для работы нужен DATABASE_URL.

Пример:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/metrix
```

Расширение

Добавление новой таблицы:

1. обновить schema.prisma
2. создать migration
3. обновить seed.ts если нужны локальные данные
4. обновить mapper и contracts в packages/api

Изменение seed:

1. редактировать seed.ts
2. не хранить реальные токены и пароли
3. после изменения перезапустить npm run prisma:seed
