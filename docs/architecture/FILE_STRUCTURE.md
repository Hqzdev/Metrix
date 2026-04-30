File Structure

О чем этот файл

Этот документ описывает, как будет организована файловая структура проекта. Он отвечает на вопрос: какие папки будут в репозитории и что в них должно лежать.

Целевая структура репозитория

```txt
src/
  app/
  modules/
  integrations/
  queues/
  realtime/
  shared/
prisma/
  migrations/
  seed/
docs/
tests/
public/
scripts/
```

Что будет лежать в основных папках

`src/app`

- страницы;
- layouts;
- route handlers;
- точка входа в web-приложение.

Примеры файлов:

```txt
src/app/page.tsx
src/app/dashboard/page.tsx
src/app/bookings/page.tsx
src/app/resources/page.tsx
src/app/analytics/page.tsx
src/app/api/bookings/route.ts
src/app/api/resources/route.ts
```

`src/modules`

- доменная и application-логика по бизнес-направлениям.

Примеры файлов:

```txt
src/modules/bookings/application/use-cases/create-booking.ts
src/modules/resources/application/use-cases/create-room.ts
src/modules/auth/application/use-cases/sign-in-with-google.ts
```

`src/integrations`

- адаптеры внешних API.

Примеры файлов:

```txt
src/integrations/google-calendar/google-calendar-adapter.ts
src/integrations/microsoft-calendar/microsoft-calendar-adapter.ts
src/integrations/telegram-bot/telegram-bot-client.ts
```

`src/queues`

- фоновые jobs и workers.

Примеры файлов:

```txt
src/queues/jobs/sync-calendar-event-job.ts
src/queues/jobs/send-booking-reminder-job.ts
src/queues/workers/calendar-sync-worker.ts
src/queues/workers/report-export-worker.ts
```

`src/realtime`

- realtime-события и транспорт.

Примеры файлов:

```txt
src/realtime/events/booking-created-event.ts
src/realtime/events/booking-cancelled-event.ts
src/realtime/ws/socket-server.ts
```

`src/shared`

- общий код, который не принадлежит конкретному доменному модулю.

Примеры файлов:

```txt
src/shared/config/env.ts
src/shared/lib/date-range.ts
src/shared/errors/app-error.ts
src/shared/logger/logger.ts
src/shared/validation/zod.ts
```

`prisma`

- схема базы данных, миграции и seed.

Примеры файлов:

```txt
prisma/schema.prisma
prisma/seed/index.ts
prisma/migrations/*
```

`tests`

- unit, integration и e2e тесты.

Примеры файлов:

```txt
tests/unit/bookings/create-booking.test.ts
tests/integration/api/bookings-route.test.ts
tests/e2e/booking-flow.spec.ts
```

Зачем нужен этот файл

Чтобы команда с первого дня создавала файлы в правильных местах, а не строила структуру стихийно.
