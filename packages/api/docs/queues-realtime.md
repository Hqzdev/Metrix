API Queues And Realtime

Этот документ описывает блок packages/api/src/queues, packages/api/src/realtime и событийный слой бронирований.

Назначение

Блок queues/realtime отвечает за фоновые задачи и живые обновления доступности.
Он не создаёт бронирования сам и не знает, как именно отправляются Telegram-сообщения или события календаря.

В этом слое не должно находиться прямое обращение к Prisma, Telegram Bot API, Google Calendar API или Microsoft Graph API.
Очереди получают данные события, а конкретные адаптеры подключаются через handlers.

Структура файлов

src/shared/redis/redis-client.ts — создание Redis connection для BullMQ
src/shared/events/booking-events.ts — события booking.created, booking.cancelled, booking.updated
src/shared/events/register-booking-event-handlers.ts — связка событий с очередями и WebSocket
src/queues/queue-names.ts — имена очередей
src/queues/calendar-sync-queue.ts — очередь синхронизации календарей
src/queues/booking-reminder-queue.ts — очередь напоминаний за 15 минут
src/realtime/availability-hub.ts — WebSocket hub для изменений доступности

Redis

redis-client.ts экспортирует createRedisConnection().

Пример:

```ts
const redis = createRedisConnection({
  url: process.env.REDIS_URL!,
})
```

process.env читается на уровне приложения.
Внутри доменных modules переменные окружения не используются.

Calendar sync queue

calendar-sync-queue.ts содержит:

* CalendarSyncJobData — payload события бронирования
* createCalendarSyncQueue(connection) — создаёт BullMQ queue
* enqueueCalendarSyncJob(queue, data) — добавляет job
* createCalendarSyncWorker(connection, handler) — создаёт worker

Очередь используется для событий:

* booking.created — создать событие в календаре
* booking.cancelled — удалить или отменить событие
* booking.updated — обновить время события

Настройки job:

* attempts: 3
* exponential backoff от 5 секунд
* removeOnComplete: 100
* removeOnFail: 500

Booking reminder queue

booking-reminder-queue.ts содержит:

* BookingReminderJobData — booking для напоминания
* createBookingReminderQueue(connection) — создаёт BullMQ queue
* enqueueBookingReminderJob(queue, booking) — ставит отложенную job
* createBookingReminderWorker(connection, handler) — создаёт worker

Напоминание ставится на 15 минут до startsAt.
Если время уже прошло, delay становится 0 и job выполняется сразу.

Worker не отправляет сообщение сам.
Он вызывает handler, а handler уже может использовать Telegram transport.

Booking events

booking-events.ts содержит event bus и имена событий:

* booking.created
* booking.cancelled
* booking.updated

Payload:

* booking — BookingResponse
* occurredAt — ISO-дата события

createBooking() после успешной транзакции может получить eventPublisher.
Если publisher передан, он публикует booking.created.

Пример:

```ts
await createBooking(input, repository, bookingEventBus)
```

Event handlers

register-booking-event-handlers.ts связывает события с инфраструктурой.

booking.created:

* отправляет availability.changed в WebSocket
* добавляет calendar sync job
* добавляет reminder job

booking.cancelled:

* отправляет availability.changed в WebSocket
* добавляет calendar sync job

booking.updated:

* отправляет availability.changed в WebSocket
* добавляет calendar sync job

Все зависимости optional.
Можно подключить только очереди, только WebSocket или всё вместе.

WebSocket availability

availability-hub.ts содержит AvailabilityHub.

Подключение:

```ts
const availabilityHub = AvailabilityHub.create(httpServer)
```

Путь по умолчанию:

```text
/ws/availability
```

Клиент может подписаться на конкретные ресурсы или локации:

```json
{
  "type": "subscribe",
  "resourceIds": ["resource-id"],
  "locationIds": ["location-id"]
}
```

Если подписка пустая, клиент получает все изменения.

Событие изменения:

```json
{
  "type": "availability.changed",
  "bookingId": "booking-id",
  "locationId": "location-id",
  "resourceId": "resource-id",
  "status": "active",
  "occurredAt": "2026-04-30T00:00:00.000Z"
}
```

Запуск

Минимальный env:

```bash
REDIS_URL=redis://localhost:6379
```

Пример сборки инфраструктуры:

```ts
const redis = createRedisConnection({ url: process.env.REDIS_URL! })
const calendarSyncQueue = createCalendarSyncQueue(redis)
const bookingReminderQueue = createBookingReminderQueue(redis)
const availabilityHub = AvailabilityHub.create(httpServer)

registerBookingEventHandlers(bookingEventBus, {
  availabilityHub,
  bookingReminderQueue,
  calendarSyncQueue,
})
```

Расширение

Добавление новой job:

1. создать файл очереди в src/queues
2. описать тип job data
3. добавить createQueue, enqueue и createWorker
4. подключить job в register-booking-event-handlers.ts если она зависит от события

Добавление нового события:

1. добавить имя в bookingEventNames
2. описать payload если текущего недостаточно
3. публиковать событие после успешной доменной операции
4. добавить обработчик в register-booking-event-handlers.ts

Замена WebSocket transport:

1. оставить AvailabilityHub как boundary
2. заменить реализацию broadcastAvailabilityChanged()
3. не менять contracts и booking modules
