File Structure

Этот документ описывает файловую структуру проекта: какие папки есть в репозитории и что в них должно лежать.

Назначение

Файловая структура должна отражать архитектуру системы.
Новые файлы должны появляться в предсказуемых местах.
Структура не должна строиться стихийно по мере реализации фич.

Целевая структура репозитория

src — приложение, модули, интеграции, очереди, realtime и shared-код
prisma — схема базы данных, миграции и seed
docs — документация проекта
tests — unit, integration и e2e тесты
public — статические файлы
scripts — служебные скрипты

apps/bot

Папка содержит Telegram-бота и его микросервисную часть.

Основные зоны:

services — runtime-сервисы, которые запускаются как процессы или контейнеры
packages — общий код для сервисов
prisma — schema, init SQL и bot-specific migrations
docker-compose.yml — локальная инфраструктура bot-сервисов
Dockerfile.service — общий Dockerfile для сборки service image

Подробная карта apps/bot описана в BOT_CODE_MAP.md.
Там простым языком расписано, что делает каждый сервис, какие файлы внутри и как сервисы связаны между собой.

src/app

Папка содержит страницы, layouts, route handlers и точки входа web-приложения.

Примеры файлов:

src/app/page.tsx
src/app/dashboard/page.tsx
src/app/bookings/page.tsx
src/app/resources/page.tsx
src/app/analytics/page.tsx
src/app/api/bookings/route.ts
src/app/api/resources/route.ts

src/modules

Папка содержит доменную и application-логику по бизнес-направлениям.

Примеры файлов:

src/modules/bookings/application/use-cases/create-booking.ts
src/modules/resources/application/use-cases/create-room.ts
src/modules/auth/application/use-cases/sign-in-with-google.ts

src/integrations

Папка содержит адаптеры внешних API.

Примеры файлов:

src/integrations/google-calendar/google-calendar-adapter.ts
src/integrations/microsoft-calendar/microsoft-calendar-adapter.ts
src/integrations/telegram-bot/telegram-bot-client.ts

src/queues

Папка содержит фоновые jobs и workers.

Примеры файлов:

src/queues/jobs/sync-calendar-event-job.ts
src/queues/jobs/send-booking-reminder-job.ts
src/queues/workers/calendar-sync-worker.ts
src/queues/workers/report-export-worker.ts

src/realtime

Папка содержит realtime-события и транспорт.

Примеры файлов:

src/realtime/events/booking-created-event.ts
src/realtime/events/booking-cancelled-event.ts
src/realtime/ws/socket-server.ts

src/shared

Папка содержит общий код, который не принадлежит конкретному доменному модулю.

Примеры файлов:

src/shared/config/env.ts
src/shared/lib/date-range.ts
src/shared/errors/app-error.ts
src/shared/logger/logger.ts
src/shared/validation/zod.ts

prisma

Папка содержит схему базы данных, миграции и seed.

Примеры файлов:

prisma/schema.prisma
prisma/seed/index.ts
prisma/migrations

tests

Папка содержит unit, integration и e2e тесты.

Примеры файлов:

tests/unit/bookings/create-booking.test.ts
tests/integration/api/bookings-route.test.ts
tests/e2e/booking-flow.spec.ts

Правила добавления файлов

Файл доменной логики добавляется в src/modules.
Файл внешнего API добавляется в src/integrations.
Файл фоновой задачи добавляется в src/queues.
Файл общего назначения добавляется в src/shared только если он не принадлежит конкретному модулю.
Файл теста добавляется в tests с сохранением типа теста.
