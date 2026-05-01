
Этот документ описывает блок apps/bot/src/integrations/calendar: авторизацию календарей, хранение токенов, создание событий, удаление событий и синхронизацию занятости.

Назначение

Блок src/integrations/calendar реализует интеграцию Telegram-бота с Google Calendar и Microsoft Outlook.
Он не отвечает за Telegram-сообщения, оплату и хранение бронирований.

В этом слое не должно находиться формирование inline-клавиатур, обработка callback_data или бизнес-логика оплаты.

Структура файлов

calendar-integration-service.ts — основной сервис интеграции, который вызывают bot-контроллеры
calendar-connection-store.ts — файловое хранилище подключений календарей с шифрованием токенов
google-calendar-adapter.ts — адаптер Google Calendar API
microsoft-calendar-adapter.ts — адаптер Microsoft Graph Calendar API
retry.ts — повтор внешних запросов при временных ошибках
types.ts — общие типы интеграции

Переменные окружения

Интеграции календарей включаются только если заданы данные провайдера.

```bash
CALENDAR_TOKEN_SECRET=long-random-secret

GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=...

MICROSOFT_CALENDAR_CLIENT_ID=...
MICROSOFT_CALENDAR_CLIENT_SECRET=...
MICROSOFT_CALENDAR_REDIRECT_URI=...
```

CALENDAR_TOKEN_SECRET используется для шифрования accessToken и refreshToken.
В локальной разработке есть fallback, но для production нужно задавать отдельный длинный секрет.

Контракт

types.ts экспортирует типы:

* CalendarProvider — провайдер календаря: google или microsoft
* CalendarProviderConfig — clientId, clientSecret, redirectUri
* CalendarConnectionScope — тип подключения: user или resource
* CalendarConnection — сохранённое подключение календаря
* CalendarTokenResponse — результат обмена code или refreshToken
* CalendarBusyInterval — занятый интервал из внешнего календаря
* CalendarAdapter — общий интерфейс адаптера календаря

Методы CalendarAdapter:

* createAuthorizationUrl(input) — создаёт oauth-ссылку
* exchangeCode(code) — меняет oauth code на токены
* refreshAccessToken(refreshToken) — обновляет accessToken
* createEvent(input) — создаёт событие в календаре
* deleteEvent(input) — удаляет событие из календаря
* listBusyIntervals(input) — получает занятые интервалы

Основной сервис

calendar-integration-service.ts содержит CalendarIntegrationService.

Сервис делает:

* создаёт oauth-ссылки
* подключает календарь после получения code
* создаёт события для бронирования
* удаляет события при отмене бронирования
* синхронизирует занятые интервалы календаря с доступными слотами
* обновляет accessToken через refreshToken

Сервис принимает BookingService, Logger и CalendarEnv через constructor.
Так он не зависит от process.env напрямую.

Хранение подключений

calendar-connection-store.ts хранит подключения в файле:

```text
data/calendar-connections.json
```

Файл содержит:

* provider
* scope
* telegramUserId
* resourceId
* calendarId
* expiresAt
* зашифрованный accessToken
* зашифрованный refreshToken

Шифрование:

* алгоритм aes-256-gcm
* ключ строится через sha256 от CALENDAR_TOKEN_SECRET
* iv генерируется отдельно для каждого значения

Типы подключений

user — личный календарь пользователя.
События создаются только для бронирований этого telegramUserId.

resource — календарь помещения или рабочего места.
Используется для занятости ресурса и создания события для этого ресурса.

Команды бота

/calendar — показывает ссылки подключения Google и Outlook.

/connect_google <code> — подключает Google Calendar пользователя.

/connect_outlook <code> — подключает Outlook Calendar пользователя.

/connect_google <resourceId> <code> — подключает Google Calendar к ресурсу.

/connect_outlook <resourceId> <code> — подключает Outlook Calendar к ресурсу.

Пример:

```text
/connect_google r12 4/0AbCd...
```

OAuth flow

1. пользователь вызывает /calendar
2. бот создаёт oauth-ссылку через CalendarIntegrationService
3. пользователь открывает ссылку и подтверждает доступ
4. пользователь отправляет code в бот
5. бот вызывает connect()
6. адаптер меняет code на accessToken и refreshToken
7. CalendarConnectionStore шифрует и сохраняет подключение

state содержит telegramUserId, scope и resourceId.

Google Calendar

google-calendar-adapter.ts работает с:

* OAuth endpoint Google
* Calendar events API
* FreeBusy API

Создание события:

```text
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

Удаление события:

```text
DELETE https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
```

Проверка занятости:

```text
POST https://www.googleapis.com/calendar/v3/freeBusy
```

Microsoft Outlook

microsoft-calendar-adapter.ts работает с Microsoft Graph.

Создание события:

```text
POST https://graph.microsoft.com/v1.0/me/events
```

Удаление события:

```text
DELETE https://graph.microsoft.com/v1.0/me/events/{eventId}
```

Проверка занятости:

```text
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule
```

Создание события после брони

После успешной оплаты PaymentController создаёт Booking.
Потом вызывается createEventsForBooking(booking).

Алгоритм:

1. найти user-подключение пользователя
2. найти resource-подключение ресурса
3. создать событие в каждом найденном календаре
4. сохранить eventId в Booking через updateBookingCalendarEvents()

Если календарь недоступен, бронирование не откатывается.
Ошибка пишется в лог.

Удаление события при отмене

При отмене бронирования bot вызывает deleteEventsForBooking(booking).

Алгоритм:

1. проверить calendarEventIds у booking
2. найти подходящие подключения
3. удалить событие у каждого провайдера
4. ошибки записать в лог

Отмена бронирования не блокируется ошибками календаря.

Синхронизация занятости

Перед показом слотов ресурса бот вызывает syncBusySlotsForResource(resourceId).

Алгоритм:

1. найти resource-подключения ресурса
2. сгенерировать слоты через booking-slots.ts
3. запросить busy intervals у провайдера
4. найти пересечения busy intervals со слотами
5. передать занятые slotId в BookingService.blockBusySlots()

После этого listAvailableSlots(resourceId) скрывает:

* уже забронированные слоты
* слоты, занятые во внешнем календаре

Retry

retry.ts содержит withRetry().

Поведение:

* по умолчанию 3 попытки
* между попытками небольшая задержка
* после последней ошибки она пробрасывается дальше

Retry используется для запросов к OAuth и Calendar API.

Расширение

Добавление нового провайдера:

1. расширить CalendarProvider в types.ts
2. создать adapter с интерфейсом CalendarAdapter
3. зарегистрировать adapter в CalendarIntegrationService
4. добавить env-переменные в lib/env.ts
5. добавить команду подключения в create-bot.ts

Изменение хранения:

1. оставить публичные методы CalendarConnectionStore
2. заменить readStore() и writeStore()
3. не хранить accessToken и refreshToken открытым текстом

Улучшение OAuth:

1. добавить backend endpoint для redirectUri
2. читать code и state на backend
3. вызывать connect() сервером
4. не просить пользователя копировать code в Telegram

Ограничения

* oauth callback endpoint пока не реализован
* пользователь вручную отправляет code в бот
* подключения хранятся в JSON-файле, не в PostgreSQL
* busy sync запускается при открытии слотов, не по расписанию
* ошибки создания и удаления событий не блокируют бронирование
