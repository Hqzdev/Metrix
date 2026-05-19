Queues And Events

Этот документ описывает асинхронную часть системы: фоновые задачи, очереди, события и связь между синхронным контуром бронирования и фоновыми процессами.

Назначение

Документ нужен, чтобы команда понимала, какие процессы должны завершаться в HTTP-запросе, а какие нужно выносить в фон без ухудшения UX.

Что описывает документ

какие операции уходят в очередь
какие события возникают в системе
какие воркеры обрабатывают события
где нужны retry
где нужна idempotency
что происходит синхронно
что происходит асинхронно

Основные очереди

calendar-sync — синхронизация календарей
booking-reminders — напоминания о бронированиях
report-export — генерация отчётов
analytics-aggregation — предрасчёт аналитики
notification-delivery — доставка уведомлений

Основные события

booking.created — создано бронирование
booking.updated — бронирование изменено
booking.cancelled — бронирование отменено
payment.completed — Telegram подтвердил оплату, нужно создать Booking
calendar.sync-requested — запрошена синхронизация календаря
report.export-requested — запрошен экспорт отчёта
analytics.recalculation-requested — запрошен пересчёт аналитики

Ожидаемые файлы

src/queues/jobs/sync-calendar-event-job.ts
src/queues/jobs/delete-calendar-event-job.ts
src/queues/jobs/send-booking-reminder-job.ts
src/queues/jobs/export-report-job.ts
src/queues/report-export-queue.ts
src/queues/workers/calendar-sync-worker.ts
src/queues/workers/notification-worker.ts
src/queues/workers/report-worker.ts
src/realtime/events/booking-created-event.ts
src/realtime/events/booking-updated-event.ts
src/realtime/events/booking-cancelled-event.ts

Report export

PDF-отчёты не должны создаваться в HTTP-запросе.

POST /api/admin/reports создаёт report record и добавляет job в report-export.
Worker собирает analytics data, генерирует PDF и обновляет статус отчёта.

Job должна быть idempotent по reportId.

Правила очередей

Долгие операции выносятся в очередь.
Внешние API вызываются с retry.
Повторная обработка job не должна создавать дубли.
Payment events должны передавать idempotency key в booking-service.
События должны содержать минимальный payload и идентификаторы сущностей.
Состояние нужно восстанавливать из БД или сервиса по id.

Redis Streams retry

RedisBus не ackает сообщение, если handler выбросил ошибку.
Сообщение остаётся в pending list consumer group.

Для повторной обработки consumer включает retryPending interval.
Retry должен запускаться в сервисе-владельце consumer group.
Внешний worker не должен перехватывать pending сообщения чужого consumer group, потому что он может ackнуть событие без выполнения бизнес-обработчика.

Алгоритм:

1. handler падает
2. сообщение остаётся pending
3. retry interval ищет pending сообщения старше idle timeout
4. RedisBus забирает сообщение через XCLAIM
5. handler запускается повторно
6. после успешной обработки сообщение ackается
7. если delivery count превышает лимит, сообщение переносится в DLQ

DLQ

DLQ stream имеет формат:

dlq:{originalStream}

Пример:

dlq:stream:notification.send

DLQ событие содержит:

data — исходный JSON payload
originalStream — исходный stream
originalId — исходный Redis message id
deliveryCount — число попыток доставки

Правила DLQ:

DLQ не считается успешной обработкой бизнес-события
перенос в DLQ всегда логируется warn-событием
payload в DLQ должен быть достаточным для ручного replay
handler должен быть идемпотентным, потому что retry может доставить событие повторно

Ручной replay описан в DLQ_REPLAY.md.
Replay нельзя выполнять автоматически без диагностики причины ошибки.

Единая retry policy описана в RETRY_STRATEGY.md.

Admin tooling

admin-service предоставляет минимальный operator API для DLQ:

GET /dlq?stream=stream:notification.send&limit=10
POST /dlq/replay

GET /dlq читает dlq:{stream}, если stream передан без префикса dlq:.
POST /dlq/replay берёт payload из DLQ сообщения и публикует его в originalStream или явно указанный targetStream.

Каждый replay пишет persistent audit action:

dlq.replayed

Правила:

оператор сначала проверяет причину падения handler
payment.completed replay разрешён только после проверки PaymentSaga
booking events replay разрешён только при наличии idempotency key
notification replay разрешён только если повторная доставка допустима для пользователя

Queue metrics

Consumer group lag публикуется в /metrics как metrix_redis_stream_lag.

Labels:

service — сервис-владелец consumer
stream — Redis Stream
group — consumer group

Если lag растёт дольше нескольких интервалов, это сигнал для alert.
Базовые alert rules описаны в ALERTING.md.

Расширение

Добавление новой очереди:

1. описать назначение очереди
2. описать payload job
3. описать worker
4. описать retry policy
5. описать idempotency key
6. описать DLQ поведение
7. описать lag metric

Добавление события:

1. выбрать имя события
2. описать источник события
3. описать payload
4. описать обработчики
5. добавить тесты на повторную обработку
