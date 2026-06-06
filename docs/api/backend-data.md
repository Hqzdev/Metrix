API Backend And Data

Этот документ объясняет root API-блок.

Важно

Он описывает packages/api и root prisma/schema.prisma.
Он не описывает весь Telegram bot microservices runtime из apps/bot.

Зачем нужен packages/api

packages/api — это reusable backend-блок.
Его можно подключить к Next route handlers или отдельному Node API.

Что внутри

- src/contracts — типы запросов и ответов.
- src/database/prisma-client.ts — общий PrismaClient.
- src/modules/bookings — создание и проверка брони.
- src/modules/resources — преобразование локаций, ресурсов и слотов.
- src/modules/admin — validation для админских изменений.
- src/shared/auth — JWT, session, password hash, auth guard.
- src/shared/validation — простые validators.

Root Prisma schema

Файл:

prisma/schema.prisma

Главные модели:

- User — пользователь или админ.
- Session — refresh-сессия.
- Location — офисная локация.
- Resource — ресурс внутри локации.
- Slot — слот времени.
- Booking — бронь.
- CalendarConnection — подключение календаря.
- CalendarEvent — событие календаря.

Auth

JWT используется для обычного API-слоя.
Пароли хешируются через pbkdf2.
Refresh sessions лежат в таблице Session.

Booking safety

Создание брони проверяет:

- существует ли resource;
- существует ли slot или переданы startsAt/endsAt;
- не пересекается ли новая бронь с активной бронью;
- можно ли создать запись в транзакции.

Обновление брони должно идти через optimistic concurrency contract:
`docs/api/booking-concurrency.md`.

Команды

npm run prisma:generate — сгенерировать Prisma Client.
npm run prisma:migrate — применить миграции.
npm run prisma:seed — заполнить локальные данные.

Как расширять

1. Сначала обновить contract.
2. Потом validator.
3. Потом use case или repository.
4. Потом mapper.
5. Потом тесты.
