Bot Code Map

Этот документ простым языком объясняет, что лежит в apps/bot.
Он нужен, чтобы человек без глубокого знания кода понял, какие сервисы есть в Telegram-боте, какие файлы за что отвечают и как части связаны между собой.

Главная идея

apps/bot — это не один большой бот.
Это набор маленьких сервисов, которые общаются между собой через HTTP, Redis и PostgreSQL.

bot-gateway принимает сообщения Telegram.
booking-service отвечает за бронирования.
payment-service отвечает за оплату и временное удержание слота.
calendar-service отвечает за подключение календарей.
notification-service отправляет сообщения в Telegram.
analytics-service считает статистику и отчёты.
admin-service даёт безопасные административные операции.
worker-service выполняет фоновые задачи.

packages содержат общий код, который используют разные сервисы.

Общие файлы сервиса

Почти каждый сервис устроен одинаково.

package.json — имя сервиса, зависимости и команды запуска.
Dockerfile — как собрать контейнер сервиса.
tsconfig.json — настройки TypeScript для этого сервиса.
.env.example — список переменных окружения, которые нужны сервису.
src/index.ts — точка входа. Здесь создаются подключения, router, workers и graceful shutdown.
src/config.ts — чтение env-переменных и проверка обязательных значений.
src/logger.ts — JSON-логи сервиса.
src/errors.ts — доменные ошибки сервиса.
src/http-response.ts — единый способ отправить JSON-ответ.

Если человек хочет понять сервис, обычно нужно читать в таком порядке:

1. .env.example
2. src/index.ts
3. src/*-router.ts или src/workers/*
4. src/config.ts

bot-gateway

Путь:

apps/bot/services/bot-gateway

За что отвечает

bot-gateway — публичная граница Telegram-бота.
Он принимает Telegram update, проверяет rate limit, хранит idempotency update_id, ведёт FSM-состояние пользователя и вызывает внутренние сервисы.

Он не должен напрямую писать бронирования или платежи в базу.
Его задача — понять команду пользователя и передать запрос правильному сервису.

Основные файлы

src/index.ts — запускает Redis, TelegramClient, Bot, health server и graceful shutdown.
src/bot.ts — главный сценарный слой Telegram. Здесь команды, callback-кнопки, платежные Telegram updates и восстановление /resume.
src/telegram-client.ts — обёртка над Telegram Bot API. Здесь getUpdates, sendMessage, sendInvoice, setWebhook и setMyCommands.
src/telegram-types.ts — типы Telegram-сообщений, callback и payment update.
src/services-client.ts — HTTP-клиент для внутренних сервисов. Он подписывает запросы HMAC и добавляет user identity.
src/callback-data.ts — безопасный парсер callback_data из inline-кнопок.
src/keyboards.ts — все inline-клавиатуры Telegram.
src/messages.ts — тексты сообщений пользователю.
src/rate-limiter.ts — Redis rate limit по пользователю.
src/telegram-update-store.ts — Redis idempotency для update_id и polling offset.
src/user-session-store.ts — Redis FSM state пользователя, version и TTL.
src/health-server.ts — /health, /ready, /metrics, Telegram webhook endpoint и Google OAuth callback boundary.
src/config.ts — TELEGRAM_BOT_TOKEN, режим polling/webhook, service URLs и secrets.
src/logger.ts — structured logs gateway.

Как связан с другими частями

bot-gateway вызывает booking-service, payment-service, calendar-service, analytics-service и admin-service через ServicesClient.
Он использует @metrix/auth для подписи HTTP-запросов.
Он использует @metrix/rbac для проверки admin-команд.
Он использует @metrix/observability для metrics и graceful shutdown.
Он использует Redis для rate limit, FSM state и Telegram update idempotency.

booking-service

Путь:

apps/bot/services/booking-service

За что отвечает

booking-service — владелец бронирований, ресурсов, локаций и занятых слотов.
Он решает, можно ли создать бронь, не занят ли слот, можно ли отменить бронь.

Самая важная задача сервиса — не допустить double booking.

Основные файлы

src/index.ts — запускает HTTP server, Prisma, RedisBus, SlotLocker, reminder scheduler и graceful shutdown.
src/booking-router.ts — HTTP API сервиса. Здесь list/create/cancel bookings, resources, locations, slots и admin updates.
src/validation.ts — проверка входных данных: resourceId, slotId, status, idempotency key.
src/slots.ts — генерация доступных слотов для ресурса.
src/booking-fsm.ts — правила переходов статуса брони.
src/booking-serialization.ts — перевод записи БД в безопасный JSON-ответ.
src/reminder-scheduler.ts — постановка reminder job в BullMQ.
src/seed.ts — тестовые начальные данные.
src/config.ts — DATABASE_URL, Redis, trusted secrets и user id secret.
src/errors.ts — ошибки booking-service.
src/http-response.ts — JSON-ответы.
src/logger.ts — structured logs.

Как связан с другими частями

bot-gateway вызывает booking-service, когда пользователь выбирает комнату, слот или отменяет бронь.
payment-service вызывает booking-service после успешной оплаты, чтобы создать финальную Booking.
analytics-service читает бронирования для статистики.
admin-service обновляет location/resource через booking-service.
booking-service публикует события booking.created и booking.cancelled в Redis Streams.
worker-service получает reminder jobs, которые создаёт booking-service.

payment-service

Путь:

apps/bot/services/payment-service

За что отвечает

payment-service — владелец invoice, оплаты, временной брони слота и PaymentSaga.
Он создаёт invoice, проверяет pre-checkout, принимает successful_payment и после оплаты запускает создание Booking.

Главная задача сервиса — чтобы деньги, временный hold и финальная бронь не разошлись.

Основные файлы

src/index.ts — запускает Prisma, RedisBus, payment consumer, expired hold cleaner и HTTP server.
src/payment-router.ts — HTTP API оплаты. Здесь invoices, pre-checkout, successful-payment и admin recovery по PaymentSaga.
src/payment-consumer.ts — consumer события payment.completed. Создаёт Booking после оплаты.
src/booking-service-client.ts — клиент booking-service, который проверяет resource/slot и создаёт Booking.
src/expired-hold-cleaner.ts — периодически переводит просроченные SlotHold в expired.
src/config.ts — provider token, currency, trusted callers, booking-service URL.
src/errors.ts — ошибки оплаты.
src/http-response.ts — JSON-ответы.
src/logger.ts — structured logs.

Как связан с другими частями

bot-gateway вызывает payment-service для создания invoice и передачи Telegram payment updates.
payment-service вызывает booking-service после успешной оплаты.
payment-service публикует notification.send, чтобы notification-service отправил invoice или сообщение.
payment-service пишет persistent audit для invoice, payment, hold и recovery actions.
admin-service проксирует recovery-команды в payment-service.

calendar-service

Путь:

apps/bot/services/calendar-service

За что отвечает

calendar-service — владелец подключений календаря пользователя.
Он создаёт OAuth URL, принимает callback, хранит encrypted tokens, обновляет access token и отключает календарь.

Главная задача сервиса — безопасно работать с Google OAuth tokens.

Основные файлы

src/index.ts — запускает HTTP server, Prisma, Redis и graceful shutdown.
src/calendar-router.ts — HTTP API календарей: auth-url, oauth-callback, connections, refresh-token, disconnect.
src/google-oauth-client.ts — запросы к Google OAuth API.
src/crypto.ts — шифрование и расшифровка календарных токенов через AES-256-GCM.
src/config.ts — Google client id/secret, redirect URI, token secret и trusted callers.
src/errors.ts — ошибки календарного сервиса.
src/http-response.ts — JSON-ответы.
src/logger.ts — structured logs.

Как связан с другими частями

bot-gateway вызывает calendar-service, когда пользователь нажимает /calendar.
bot-gateway принимает публичный Google OAuth callback и проксирует его в calendar-service.
worker-service может вызывать calendar-service для фонового refresh.
calendar-service пишет audit log для connect/disconnect.

notification-service

Путь:

apps/bot/services/notification-service

За что отвечает

notification-service отправляет сообщения, invoices и документы в Telegram.
Он читает Redis Stream notification.send и вызывает Telegram Bot API.

Главная идея — долгие или повторяемые отправки не должны выполняться внутри handler пользователя.

Основные файлы

src/index.ts — запускает RedisBus consumer и graceful shutdown.
src/telegram-client.ts — методы отправки сообщений, invoices и документов в Telegram.
src/config.ts — TELEGRAM_BOT_TOKEN, Redis и REPORTS_DIR.
src/errors.ts — ошибки notification-service.
src/logger.ts — structured logs.

Как связан с другими частями

payment-service публикует send_invoice и send_message события.
worker-service публикует reminders и report delivery события.
notification-service забирает эти события из Redis и доставляет их в Telegram.
Если доставка падает после retry, событие уходит в DLQ.

analytics-service

Путь:

apps/bot/services/analytics-service

За что отвечает

analytics-service считает статистику по бронированиям.
Он отдаёт summary, stats, heatmap, utilization, peak hours и создаёт report records.

Главная задача сервиса — читать факты и считать агрегаты, не меняя бронирования.

Основные файлы

src/index.ts — запускает Prisma, RedisBus, event consumers и HTTP server.
src/analytics-router.ts — HTTP API аналитики и отчётов.
src/analytics-calculations.ts — функции расчёта метрик.
src/booking-client.ts — чтение booking-service для получения бронирований.
src/event-consumers.ts — Redis Stream consumers для аналитических событий и lag metrics.
src/report-validation.ts — проверка report request и report id.
src/config.ts — service URLs, Redis, trusted callers и signing secrets.
src/errors.ts — ошибки аналитики.
src/http-response.ts — JSON-ответы.
src/logger.ts — structured logs.

Как связан с другими частями

bot-gateway и admin-service читают analytics-service для статистики.
analytics-service слушает booking events через Redis Streams.
worker-service выполняет тяжёлую генерацию отчёта, а analytics-service хранит статус report.

admin-service

Путь:

apps/bot/services/admin-service

За что отвечает

admin-service — внутренняя административная граница.
Он отдаёт audit logs, DLQ tooling, PaymentSaga recovery queue и проксирует привилегированные изменения в booking/payment/analytics сервисы.

Главная задача сервиса — дать оператору безопасные инструменты, не открывая прямой доступ к БД и Redis.

Основные файлы

src/index.ts — запускает HTTP server, Prisma, Redis, audit retention cleanup и graceful shutdown.
src/admin-router.ts — HTTP API admin-service. Здесь bookings, stats, audit-logs, dlq, payment-sagas, reports и updates.
src/audit-retention.ts — scheduled cleanup старых audit logs.
src/signed-http-client.ts — подписанный клиент для downstream-сервисов.
src/validation.ts — whitelist полей для обновления location/resource и безопасное чтение id из path.
src/config.ts — admin secrets, service URLs, audit retention settings.
src/errors.ts — ошибки admin-service.
src/http-response.ts — JSON-ответы.
src/logger.ts — structured logs.

Как связан с другими частями

bot-gateway вызывает admin-service для admin-команд.
admin-service вызывает booking-service для изменения locations/resources.
admin-service вызывает payment-service для PaymentSaga recovery.
admin-service читает Redis DLQ streams и может replay-ить сообщение.
admin-service читает PostgreSQL audit log.

worker-service

Путь:

apps/bot/services/worker-service

За что отвечает

worker-service выполняет фоновые задачи.
Это задачи, которые нельзя делать прямо в Telegram update handler или HTTP-запросе.

Основные файлы

src/index.ts — запускает Redis, Prisma, RedisBus и все BullMQ workers.
src/queues.ts — имена очередей и типы payload jobs.
src/workers/reminder.worker.ts — отправляет напоминания о бронированиях.
src/workers/calendar-refresh.worker.ts — обновляет календарные подключения в фоне.
src/workers/report.worker.ts — генерирует отчёты и отправляет их через notification-service.
src/logger.ts — structured logs worker-service.

Как связан с другими частями

booking-service ставит reminder jobs.
analytics-service создаёт report records.
worker-service выполняет тяжёлую работу и публикует notification.send.
notification-service доставляет результат пользователю в Telegram.

packages

packages — общий код.
Их задача — не копировать одну и ту же логику по сервисам.

@metrix/auth

Путь:

apps/bot/packages/auth

За что отвечает

Пакет отвечает за безопасность межсервисных HTTP-запросов.

Файлы:

src/index.ts — HMAC headers, verifyServiceRequest, replay request id, user id signature, OAuth state signature, traceparent и безопасное чтение JSON body.

Кто использует

Почти все HTTP-сервисы.
bot-gateway подписывает запросы.
booking-service, payment-service, calendar-service, analytics-service и admin-service проверяют подпись.

@metrix/audit-log

Путь:

apps/bot/packages/audit-log

За что отвечает

Пакет пишет persistent audit log в PostgreSQL.

Файлы:

src/index.ts — тип AuditLogInput и функция writeAuditLog.

Кто использует

booking-service, payment-service, calendar-service и admin-service.

@metrix/contracts

Путь:

apps/bot/packages/contracts

За что отвечает

Пакет хранит общие типы и имена событий.
Он помогает сервисам говорить на одном языке.

Файлы:

src/index.ts — DTO, Booking, Resource, Location, CalendarConnection, AnalyticsSummary, stream names и payment contracts.

Кто использует

bot-gateway, booking-service, payment-service, analytics-service, worker-service, redis-bus и tests.

@metrix/health

Путь:

apps/bot/packages/health

За что отвечает

Пакет даёт общий health/readiness check для PostgreSQL и Redis.

Файлы:

src/index.ts — runHealthChecks.

Кто использует

booking-service и другие сервисы, которым нужен одинаковый формат проверки зависимостей.

@metrix/observability

Путь:

apps/bot/packages/observability

За что отвечает

Пакет отвечает за metrics, readiness response и graceful shutdown.

Файлы:

src/index.ts — MetricsRegistry, HTTP metrics wrapper, sendMetrics, sendReadiness, installGracefulShutdown.

Кто использует

Все runtime-сервисы, где есть HTTP server или корректное завершение процесса.

@metrix/rbac

Путь:

apps/bot/packages/rbac

За что отвечает

Пакет отвечает за роли и permissions.
Он решает, может ли пользователь выполнить admin-действие.

Файлы:

src/index.ts — роли, permissions, policy evaluation и Telegram actor.

Кто использует

bot-gateway для admin-команд.
В будущем может использоваться web API.

@metrix/redis-bus

Путь:

apps/bot/packages/redis-bus

За что отвечает

Пакет отвечает за Redis Streams, retry, DLQ и distributed slot locks.

Файлы:

src/index.ts — RedisBus, publish, subscribe, retryPending, DLQ, replay protection.
src/slot-locker.ts — Redis lock для защиты одного slot от параллельного бронирования.

Кто использует

booking-service использует RedisBus и SlotLocker.
payment-service использует RedisBus для payment.completed и notification.send.
analytics-service слушает события.
notification-service слушает notification.send.
worker-service публикует notification events.

Как проходит обычное бронирование

1. Пользователь пишет /book в Telegram.
2. bot-gateway показывает локации и сохраняет FSM state в Redis.
3. Пользователь выбирает комнату и слот.
4. bot-gateway вызывает payment-service, чтобы создать invoice.
5. payment-service проверяет slot через booking-service.
6. payment-service создаёт SlotHold, PendingInvoice и PaymentSaga.
7. payment-service публикует notification.send.
8. notification-service отправляет invoice в Telegram.
9. Telegram присылает successful_payment.
10. bot-gateway передаёт payment update в payment-service.
11. payment-service публикует payment.completed.
12. payment-consumer вызывает booking-service.
13. booking-service создаёт Booking атомарно и пишет audit.
14. payment-service переводит saga в completed.
15. notification-service отправляет подтверждение пользователю.

Как проходит отмена бронирования

1. Пользователь открывает /my_bookings.
2. bot-gateway получает список бронирований из booking-service.
3. Пользователь нажимает cancel.
4. bot-gateway вызывает booking-service PATCH /bookings/{bookingId}.
5. booking-service проверяет владельца брони.
6. booking-service меняет status на cancelled.
7. booking-service публикует booking.cancelled.
8. reminder job отменяется, если он ещё не сработал.
9. audit log получает booking.cancelled.

Как работает DLQ

1. Сервис слушает Redis Stream.
2. Handler падает.
3. Сообщение остаётся pending.
4. retryPending пытается обработать его ещё раз.
5. После лимита попыток RedisBus переносит событие в dlq:{stream}.
6. admin-service показывает DLQ через GET /dlq/streams и GET /dlq.
7. Оператор проверяет причину.
8. Оператор может replay-ить событие через POST /dlq/replay.

Как работает recovery оплаты

1. Если оплата прошла, но Booking не создан, PaymentSaga получает status = failed.
2. admin-service показывает такие saga через GET /payment-sagas?status=recovery.
3. Оператор может посмотреть saga через GET /payment-sagas/{invoiceId}.
4. Если booking-service уже восстановлен, оператор вызывает retry-booking.
5. Если нужен возврат денег, оператор вызывает compensate.
6. После внешнего refund оператор вызывает mark-compensated.

Что важно не путать

bot-gateway — не хранит бизнес-данные.
booking-service — владелец бронирований.
payment-service — владелец оплаты, invoice, hold и saga.
calendar-service — владелец календарных токенов.
notification-service — только доставка сообщений.
analytics-service — только расчёт и чтение метрик.
admin-service — безопасный operator boundary.
worker-service — фоновые задачи.
packages — общий код, не отдельные runtime-сервисы.
