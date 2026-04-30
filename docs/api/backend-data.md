API Backend And Data

Этот документ описывает блок packages/api и prisma: контракты API, Prisma-схему, seed, auth, validation и безопасное создание бронирований.

Назначение

Блок packages/api содержит backend-логику, которую можно подключить к Next route handlers или отдельному Node API.
Он не зависит от Telegram UI и не формирует сообщения бота.

В этом слое не должно находиться React, Telegram callback_data или визуальная логика.

Структура файлов

src/contracts — типы запросов и ответов API
src/database/prisma-client.ts — единый PrismaClient
src/modules/bookings — создание брони, mapper, repository, validation
src/modules/resources — mapper для локаций, ресурсов и слотов
src/modules/admin — validation для админских изменений
src/shared/auth — jwt, session, password hash, auth guard
src/shared/validation — маленький runtime validator

prisma/schema.prisma — схема PostgreSQL
prisma/migrations — SQL-миграции
prisma/seed.ts — seed-данные для локальной разработки

Prisma schema

schema.prisma содержит модели:

* User — пользователь или администратор
* Session — refresh-сессия
* Location — офисная локация
* Resource — переговорка, desk, office или team area
* Slot — временной слот ресурса
* Booking — бронирование
* CalendarConnection — подключение Google или Microsoft календаря
* CalendarEvent — созданное событие календаря

Команды запускаются из корня проекта:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Основные enum:

* UserRole — admin, employee
* ResourceType — desk, office, room, team
* BookingStatus — active, cancelled, completed, rescheduled
* CalendarProvider — google, microsoft
* CalendarConnectionScope — user, resource

Seed

prisma/seed.ts создаёт:

* локального admin-пользователя
* московские локации
* ресурсы с ценами в рублях
* три слота на каждый ресурс

Цены вида "$320" конвертируются в "32 000 ₽".
priceMinorUnits хранит копейки для RUB.

API contracts

contracts/bookings.ts содержит:

* CreateBookingRequest
* CancelBookingRequest
* RescheduleBookingRequest
* BookingResponse
* ListBookingsQuery

contracts/resources.ts содержит:

* LocationResponse
* ResourceResponse
* AvailableSlotResponse
* UpdateLocationRequest
* UpdateResourceRequest

contracts/calendar.ts содержит:

* ConnectCalendarRequest
* CalendarConnectionResponse

contracts/admin.ts содержит:

* AdminStatsResponse
* ResourceUtilizationResponse
* HourlyOccupancyResponse
* ReportExportRequest

Auth

shared/auth/jwt.ts создаёт и проверяет JWT через HS256.

shared/auth/password.ts хеширует пароль через pbkdf2.

shared/auth/session-service.ts создаёт refreshToken в таблице Session и короткий accessToken.

shared/auth/auth-guard.ts содержит:

* authenticateRequest() — читает Bearer token
* requireAdmin() — проверяет роль admin

JWT secret должен приходить из env на уровне приложения.

Validation

shared/validation/validator.ts содержит простые validators без внешних зависимостей.

modules/bookings/booking-validators.ts валидирует:

* создание брони
* отмену брони
* перенос брони

modules/admin/admin-validators.ts валидирует:

* обновление локации
* обновление ресурса

Concurrency-safe booking

modules/bookings/create-booking.ts создаёт бронь через BookingRepository.

Алгоритм:

1. открыть транзакцию Serializable
2. найти resource
3. найти slot или взять startsAt/endsAt из запроса
4. проверить валидность времени
5. проверить активные пересечения по resourceId
6. создать Booking

Проверка пересечения:

```text
existing.startsAt < new.endsAt
existing.endsAt > new.startsAt
status = active
```

Это закрывает двойное бронирование одного ресурса на одно время.

Расширение

Добавление нового endpoint:

1. описать request/response в src/contracts
2. добавить validator в нужный module
3. держать route handler тонким
4. бизнес-логику вынести в use-case
5. доступ к базе делать через repository

Добавление поля в БД:

1. обновить prisma/schema.prisma
2. добавить migration
3. обновить mapper и contracts
4. обновить seed если поле нужно для локальных данных

Замена auth:

1. оставить authenticateRequest() как границу
2. поменять реализацию jwt/session внутри shared/auth
3. не протаскивать process.env в доменные modules
