# API Backend And Data

Этот документ описывает root API-блок Metrix: `packages/api`, общую Prisma
схему в `prisma/schema.prisma` и правила работы с данными, которые относятся к
web/API слою. Telegram microservices runtime из `apps/bot` описан отдельно в
`docs/telegram-bot/`.

## Роль `packages/api`

`packages/api` - переиспользуемый backend пакет. Его можно подключать к Next.js
route handlers, отдельному Node API или тестовым harness-ам без копирования
бизнес-логики.

Пакет держит три слоя:

- `src/contracts` - типы запросов, ответов и публичных DTO.
- `src/modules/*` - use cases и мапперы конкретных доменных областей.
- `src/shared/*` - auth, validation и общие инфраструктурные helper-ы.

## Данные и владение

Root Prisma schema находится в `prisma/schema.prisma`. Она описывает данные,
которые нужны web/API слою и общим интеграциям:

- `User` и `Session` - пользовательские аккаунты, роли и refresh sessions.
- `Location`, `Resource`, `Slot` - каталог локаций, ресурсов и доступных слотов.
- `Booking` - подтвержденная бронь и ее состояние.
- `CalendarConnection`, `CalendarEvent` - подключенные календари и синхронизация.

Владелец модели должен быть понятен до изменения схемы. Если модель используется
и root API, и bot microservices, изменение сначала согласуется через contract или
миграцию, а затем раскатывается в оба runtime.

## Booking safety

Создание брони должно оставаться транзакционным:

- проверить существование `Resource`;
- проверить `Slot` или явный интервал `startsAt`/`endsAt`;
- отфильтровать активные брони, которые пересекаются с новым интервалом;
- создать запись в транзакции, чтобы параллельные запросы не расходились.

Любая новая ветка логики бронирования должна явно отвечать, что происходит при
повторном запросе, конфликте слота и отмене брони.

## Auth

JWT используется для API-запросов. Пароли хешируются через `pbkdf2`, а refresh
sessions хранятся в таблице `Session`. Код, который читает user identity, не
должен доверять client-provided id без проверки токена или server-side session.

## Команды

- `npm run prisma:generate` - сгенерировать Prisma Client.
- `npm run prisma:validate` - проверить схему без подключения к production DB.
- `npm run prisma:migrate` - применить локальную миграцию.
- `npm run prisma:seed` - заполнить локальные данные.

## Чеклист расширения

1. Обновить contract или DTO.
2. Добавить validation для входных данных.
3. Обновить use case и repository/Prisma запрос.
4. Добавить mapper для ответа наружу.
5. Покрыть happy path, conflict path и invalid input тестами.
