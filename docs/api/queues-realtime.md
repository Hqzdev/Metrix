API Queues And Realtime

Этот документ объясняет queues/realtime слой в packages/api.

Важно

Это не главный Redis Streams runtime из apps/bot.
Это reusable API-блок с BullMQ и WebSocket availability.

Зачем нужен слой

Он помогает делать фоновые задачи и живые обновления доступности.

Что внутри

- redis-client.ts — создает Redis connection.
- booking-events.ts — описывает события бронирований.
- register-booking-event-handlers.ts — связывает события с очередями и WebSocket.
- calendar-sync-queue.ts — очередь синхронизации календарей.
- booking-reminder-queue.ts — очередь напоминаний.
- availability-hub.ts — WebSocket hub.

Booking events

События:

- booking.created
- booking.cancelled
- booking.updated

Что происходит после события

booking.created:

- отправить availability.changed в WebSocket;
- поставить calendar sync job;
- поставить reminder job.

booking.cancelled:

- отправить availability.changed;
- поставить calendar sync job.

booking.updated:

- отправить availability.changed;
- поставить calendar sync job.

BullMQ настройки

Все jobs должны получать стабильный jobId из bookingId/resourceId, чтобы retry
или повторное событие не создавали дубль фоновой задачи.

Calendar sync:

- attempts: 3
- backoff: exponential, 5 seconds
- removeOnComplete: 100
- removeOnFail: 500

Booking reminder:

- attempts: 3
- backoff: exponential, 10 seconds
- reminder запускается за 15 минут до брони.

WebSocket

Путь по умолчанию:

/ws/availability

Клиент может подписаться на resourceIds или locationIds.
Если подписка пустая, клиент получает все изменения.
