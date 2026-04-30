Queues And Events

О чем этот файл

Этот документ описывает асинхронную часть системы: фоновые задачи, очереди, события и взаимодействие между синхронным контуром бронирования и фоновыми процессами.

Что здесь должно быть описано

- какие операции уходят в очередь;
- какие события возникают в системе;
- какие воркеры их обрабатывают;
- где нужны retry и idempotency;
- что происходит синхронно, а что асинхронно.

Основные очереди

- `calendar-sync`
- `booking-reminders`
- `report-export`
- `analytics-aggregation`
- `notification-delivery`

Основные события

- `booking.created`
- `booking.updated`
- `booking.cancelled`
- `calendar.sync-requested`
- `report.export-requested`
- `analytics.recalculation-requested`

Какие файлы появятся в проекте

```txt
src/queues/jobs/sync-calendar-event-job.ts
src/queues/jobs/delete-calendar-event-job.ts
src/queues/jobs/send-booking-reminder-job.ts
src/queues/jobs/export-report-job.ts
src/queues/workers/calendar-sync-worker.ts
src/queues/workers/notification-worker.ts
src/queues/workers/report-worker.ts
src/realtime/events/booking-created-event.ts
src/realtime/events/booking-updated-event.ts
src/realtime/events/booking-cancelled-event.ts
```

Зачем нужен этот файл

Чтобы команда чётко понимала, какие процессы должны завершаться в HTTP-запросе, а какие надо выносить в фон без ухудшения UX.
