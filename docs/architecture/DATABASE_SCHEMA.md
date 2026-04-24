# Database Schema

## О чем этот файл

Этот документ описывает схему данных проекта: основные сущности, связи, ограничения и технические правила хранения данных.

## Что здесь должно быть описано

- список таблиц;
- связи между таблицами;
- обязательные поля;
- индексы;
- ограничения на пересечения броней;
- поля для интеграций, аудита и аналитики.

## Основные сущности базы данных

- `users`
- `rooms`
- `desks`
- `bookings`
- `booking_participants`
- `calendar_connections`
- `calendar_events`
- `notifications`
- `usage_metrics`
- `reports`
- `audit_logs`

## Какие файлы появятся в проекте

```txt
prisma/schema.prisma
prisma/seed/index.ts
prisma/seed/resources.seed.ts
prisma/seed/users.seed.ts
prisma/migrations/*
```

Если схема будет разнесена логически, дополнительно могут появиться:

```txt
src/database/mappers/booking-mapper.ts
src/database/mappers/resource-mapper.ts
src/database/repositories/prisma-user-repository.ts
src/database/repositories/prisma-booking-repository.ts
```

## Какие вопросы должен закрывать этот файл

- как хранить переговорные и рабочие места;
- как хранить временные интервалы и пересечения;
- как связать внутреннюю бронь с внешним календарным событием;
- как хранить аналитические агрегаты;
- как хранить журнал действий.

## Зачем нужен этот файл

Чтобы схема БД не проектировалась на лету по мере написания контроллеров и UI.
