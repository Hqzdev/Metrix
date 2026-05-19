Security Architecture

Этот документ описывает модель безопасности микросервисной части Metrix в apps/bot.

Назначение

Система работает на localhost и предназначена для тестирования, но реализует production-уровень защиты.
Это нужно, потому что Telegram-бот доступен любому пользователю в интернете, компрометация одного сервиса не должна давать доступ ко всем остальным, а токены Google и платёжные данные требуют строгой изоляции.

Доверенная граница

Единственная публичная точка входа — bot-gateway на порту 3000.
Локально Telegram API может взаимодействовать с bot-gateway через long polling.
В production рекомендуется webhook mode.

Внутренние сервисы доступны только внутри Docker internal network.

Внутренние сервисы:

booking-service — порт 3001
calendar-service — порт 3002
payment-service — порт 3003
analytics-service — порт 3005
admin-service — порт 3006

PostgreSQL и Redis не должны быть доступны снаружи.
Все сервисы кроме bot-gateway должны быть скрыты внутри Docker-сети.

1. Сетевая изоляция

docker-compose.yml использует expose вместо ports для всех внутренних сервисов.
bot-gateway — единственный сервис с публичным port mapping.
PostgreSQL и Redis также используют expose и не пробрасываются на host.

Итог:

атакующий снаружи не может напрямую обратиться к booking-service
атакующий снаружи не может напрямую обратиться к admin-service
атакующий снаружи не может напрямую обратиться к БД
все внешние запросы проходят через bot-gateway

2. Service-to-Service аутентификация

Единый INTERNAL_SECRET запрещён.
Если один сервис скомпрометирован, общий секрет скомпрометирует всю систему.

Каждый вызывающий сервис имеет собственный signing secret.
Принимающий сервис хранит список доверенных вызывающих и их секреты.
Во время ротации принимающий сервис может принимать TRUSTED_*_SECRET и TRUSTED_*_SECRET_NEXT.

Каждый межсервисный HTTP-запрос содержит заголовки:

X-Service-Name — имя вызывающего сервиса
X-Timestamp — Unix timestamp запроса
X-Request-Id — UUID запроса
X-Signature — HMAC-SHA256 подпись в hex
Content-Type — application/json

Формула подписи:

message строится из HTTP method, path, timestamp, request id и sha256 тела запроса.
signature создаётся через HMAC-SHA256 с service signing secret.

Подпись покрывает метод, путь, время, уникальный ID и хэш тела.
Подмена любого компонента делает подпись невалидной.

Матрица доверия:

booking-service доверяет bot-gateway, payment-service, analytics-service и admin-service
calendar-service доверяет bot-gateway
payment-service доверяет bot-gateway и admin-service
analytics-service доверяет bot-gateway и admin-service
admin-service доверяет bot-gateway

Переменные окружения:

GATEWAY_SIGNING_SECRET — секрет bot-gateway
PAYMENT_SIGNING_SECRET — секрет payment-service
ANALYTICS_SIGNING_SECRET — секрет analytics-service
ADMIN_SIGNING_SECRET — секрет admin-service
TRUSTED_GATEWAY_SECRET — секрет bot-gateway для принимающего сервиса
TRUSTED_PAYMENT_SECRET — секрет payment-service для принимающего сервиса
TRUSTED_ANALYTICS_SECRET — секрет analytics-service для принимающего сервиса
TRUSTED_ADMIN_SECRET — секрет admin-service для принимающего сервиса
TRUSTED_*_SECRET_NEXT — опциональный next secret для dual-read во время ротации

Верификация выполняется в packages/auth/src/index.ts.

Алгоритм:

1. проверить наличие обязательных заголовков
2. проверить timestamp в пределах 30 секунд
3. найти вызывающий сервис в списке доверенных
4. воспроизвести подпись
5. сравнить подпись через timingSafeEqual

timingSafeEqual защищает от timing-атак при сравнении HMAC.
При неизвестном имени сервиса возвращается нейтральный unauthorized без раскрытия ожидаемых имён.

3. Защита от replay-атак

Даже валидный подписанный запрос можно повторить.
Для защиты используется X-Request-Id и Redis TTL.

Каждый запрос содержит уникальный X-Request-Id в формате UUID v4.

Принимающий сервис:

1. пытается записать replay:{requestId} в Redis с TTL 60 секунд и NX
2. если запись создана — запрос новый
3. если запись уже существует — возвращается 409 Conflict

X-Timestamp дополнительно ограничен 30 секундами.
Запрос старше этого порога отклоняется до проверки replay.

Цепочка защиты:

1. запрос получен
2. проверяется timestamp
3. проверяется HMAC подпись
4. проверяется request id в Redis
5. запрос обрабатывается

Если timestamp невалиден — 401.
Если подпись невалидна — 401.
Если request id уже использован — 409.

4. Идентификация пользователя

telegramUserId не должен передаваться как доверенное поле тела запроса.
Иначе любой аутентифицированный сервис сможет подделать пользователя.

Bot-gateway — единственный сервис, взаимодействующий с Telegram.
Он подписывает userId отдельным секретом USER_ID_SIGNING_SECRET.

Заголовки:

X-User-Id — Telegram user id
X-User-Sig — HMAC-SHA256 подпись user id

Принимающий сервис верифицирует подпись через timingSafeEqual.
Если заголовок отсутствует, запрос считается автоматическим, например от payment-service после оплаты, и telegramUserId берётся из тела.

Проверка владельца брони обязательна.
booking-service при отмене брони сравнивает callerUserId с telegramUserId бронирования.
Пользователь не может отменить чужую бронь даже зная bookingId.
Запрещённая попытка пишется в audit log как booking.cancel.forbidden.

5. OAuth State

Google OAuth возвращает state в redirect.
Без подписи атакующий может подменить telegramUserId в state и привязать чужой Google-аккаунт.

state должен подписываться через HMAC-SHA256.

При генерации auth URL в state помещаются telegramUserId, scope и resourceId.
Payload кодируется и подписывается через TOKEN_SECRET.

При обработке callback подпись state проверяется через timingSafeEqual.
Если state подделан или повреждён, calendar-service возвращает 400 и не создаёт подключение.

6. Шифрование и жизненный цикл токенов Google

OAuth access token и refresh token хранятся в PostgreSQL только в зашифрованном виде.

Используется AES-256-GCM.
Ключ выводится через HKDF-SHA256 из CALENDAR_TOKEN_SECRET с контекстом metrix-calendar-tokens-v1.
Формат хранения: base64(iv).base64(auth_tag).base64(ciphertext).

Правила хранения:

AES-256-GCM обеспечивает аутентифицированное шифрование и обнаруживает модификацию
HKDF-SHA256 используется для корректной деривации ключа из секрета
случайный IV длиной 12 байт создаётся для каждого шифрования
CALENDAR_TOKEN_SECRET обязателен
сервис не должен запускаться без CALENDAR_TOKEN_SECRET
в production GOOGLE_REDIRECT_URI должен начинаться с https

Правила получения токена (oauth-callback):

exchangeCode бросает ошибку если Google не вернул refresh_token.
Сохранение access_token в поле refreshToken запрещено — access token живёт ~1 час, после чего подключение молча ломается.
Если refresh_token отсутствует в ответе Google — пользователь должен пройти OAuth повторно с prompt=consent.

Обновление access token (POST /refresh-token):

Когда caller обнаруживает, что expiresAt < now, он вызывает POST /refresh-token.
calendar-service расшифровывает refresh token из БД, обменивает его на новый access_token через Google, сохраняет результат.
Refresh token при этом не меняется — Google не ротирует его при обычном refresh.

Отзыв токена при disconnect:

Удаление записи из БД не отзывает доступ на стороне Google.
При DELETE /connections calendar-service вызывает POST https://oauth2.googleapis.com/revoke с refresh token перед удалением из БД.
Ошибка revoke логируется, но не блокирует disconnect — пользователь должен иметь возможность отвязать аккаунт даже при недоступности Google API.
400 от Google при revoke означает, что токен уже истёк или не существует — не ошибка.

7. Rate limiting

Bot-gateway ограничивает частоту запросов от каждого пользователя.

Лимит — 10 запросов за 10 секунд.
Алгоритм — fixed window.
Реализация — Redis INCR и EXPIRE.

Rate limit сохраняется при рестарте и корректно работает при горизонтальном масштабировании.
При превышении бот отвечает Too many requests. и игнорирует update.

Функция rate limit передаётся в Bot как зависимость через BotOptions.rateLimit.
Это позволяет подменять реализацию в тестах.

8. Telegram update idempotency

Telegram может прислать update повторно.
Bot-gateway также может перезапуститься между polling cycles.

In-memory Set недостаточен:

рестарт процесса очищает память
несколько gateway instances не делят состояние
offset теряется и старые updates могут прийти снова

Bot-gateway хранит состояние Telegram polling в Redis.

Ключи:

telegram:updates:processed:{updateId} — факт обработки update
telegram:updates:offset — последний сохранённый polling offset

Правила:

processed key создаётся через SET NX EX
TTL processed key — 7 дней
offset сохраняется монотонно через Lua script
старый gateway instance не может перезаписать новый offset меньшим значением

Алгоритм:

1. при старте gateway читает telegram:updates:offset
2. для каждого update пытается создать processed key
3. если ключ уже есть, update пропускается
4. после обработки сохраняется offset = update_id + 1

Эта защита не заменяет idempotency в booking-service и payment-service.
Она только защищает Telegram boundary от повторной обработки одного update.

9. Защита от double booking

Двойное бронирование предотвращается двумя слоями.

Слой 1 — Prisma transaction.
В transaction проверяется существующая активная бронь для resourceId и slotId.
Если слот занят, выбрасывается ошибка SLOT_TAKEN.
Если слот свободен, создаётся booking.

Слой 2 — PostgreSQL partial unique index.
Индекс запрещает две активные брони на одну пару resourceId и slotId.

Даже если два параллельных запроса одновременно прошли transaction-check, PostgreSQL отклонит второй через unique constraint violation.

10. Валидация входных данных

Каждый сервис проверяет входные данные.

Правила:

Content-Type для POST, PATCH и DELETE должен быть application/json
размер тела запроса не больше 64 KB
telegramUserId должен быть положительным целым числом
resourceId должен быть непустой строкой
slotId должен быть непустой строкой
status при отмене может быть только cancelled или rescheduled

readJsonBody в packages/auth/src/index.ts проверяет content type и размер тела до парсинга JSON.

Telegram callback data

callback_data валидируется в bot-gateway до вызова service layer.
Даже если callback создан нашими inline-кнопками, вход считается недоверенным.

Правила:

callback_data не больше 64 bytes
команда должна иметь известный prefix
количество сегментов должно точно совпадать с ожидаемым форматом
resourceId, slotId, bookingId и locationId проходят safe-token проверку
calendar provider может быть только google или microsoft

Невалидный callback логируется как telegram.callback.invalid и не вызывает downstream-сервисы.

11. Redis Security

Redis должен быть защищён паролем.
Опасные команды должны быть отключены через rename-command.
Redis доступен только внутри Docker-сети.

Отключаются команды:

FLUSHALL
FLUSHDB
DEBUG
CONFIG

12. Идентификаторы ресурсов

Все идентификаторы, создаваемые в системе, используют randomUUID() из node:crypto.

Booking ID создаётся через randomUUID().
Invoice ID создаётся через randomUUID().

Запрещены идентификаторы на базе Date.now() и Math.random().
Это исключает атаки перебора и предсказания ID.

13. Защита от межсервисных зависаний

Все межсервисные fetch-вызовы выполняются с таймаутом 5 секунд.
Внешние OAuth-запросы выполняются с таймаутом 10 секунд.

Это предотвращает каскадный отказ, при котором зависание одного сервиса накапливает незавершённые запросы во всех вызывающих сервисах.

14. Административный доступ

Команда /stats доступна только пользователям из ADMIN_TELEGRAM_IDS.
ADMIN_TELEGRAM_IDS используется только как источник назначения роли admin.
Проверка доступа выполняется через RBAC policy helpers из apps/bot/packages/rbac.

Все admin-команды обязаны проверять permission admin:read или admin:write перед обращением к admin или analytics сервисам.
Неавторизованному пользователю возвращается нейтральный ответ Access denied.
Ответ не должен раскрывать детали проверки.

15. Whitelist полей при обновлении ресурсов

admin-service при PATCH-запросах явно перечисляет допустимые поля.
Все остальные поля отклоняются.

Допустимые поля UpdateResourceInput:

priceLabel
priceMinorUnits
occupancy
status

Системные поля запрещены к обновлению через API.
К запрещённым полям относятся id и locationId.

Это защищает от mass assignment.

16. Audit Log

Мутирующие действия пишут структурированный JSON в stdout и persistent audit log в PostgreSQL.

Запись audit log содержит:

ts — время события
service — имя сервиса
action — действие
actorUserId — пользователь, если применимо
entityType — тип сущности
entityId — идентификатор сущности
requestId — идентификатор запроса
callerService — вызывающий сервис
payload — безопасные дополнительные детали события

Persistent audit хранится в audit."AuditLog".
Сервисная запись выполняется через @metrix/audit-log.
RBAC decisions описаны в RBAC_AND_AUDIT.md и реализуются через @metrix/rbac.
Правила чтения, redaction и retention описаны в AUDIT_LOG_POLICY.md.
admin-service выполняет scheduled cleanup старых audit records по AUDIT_RETENTION_DAYS.

Ошибка записи persistent audit логируется как audit.persist.failed.
Текущий режим — non-blocking audit: бизнес-операция не откатывается только из-за ошибки audit insert.
Это временный компромисс до транзакционного audit для критичных money operations.

Покрытые события:

booking.created — booking-service
booking.cancelled — booking-service
booking.cancel.forbidden — booking-service
invoice.created — payment-service
payment.completed — payment-service
payment.hold_expired — payment-service
payment.part_completed — payment-service
payment.booking_created — payment-service
payment.booking_failed — payment-service
payment.compensation_started — payment-service
payment.booking_retry_requested — payment-service
payment.compensated — payment-service
calendar.connected — calendar-service
calendar.disconnected — calendar-service
location.updated — admin-service
resource.updated — admin-service
dlq.replayed — admin-service

17. SSRF Protection

calendar-service делает внешние HTTP-запросы только к разрешённым Google OAuth hosts.

Разрешённые hosts:

oauth2.googleapis.com
accounts.google.com

Перед внешним запросом target hostname проверяется по allowlist.
Запрос к неизвестному host отклоняется.

18. Security headers и CORS

Web boundary задаёт security headers в apps/web/next.config.mjs.

Обязательные headers:

Strict-Transport-Security
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy

CORS policy по умолчанию закрытая.
Internal services не должны быть доступны браузеру напрямую.
Новые public API routes должны явно описывать allowed origins.

Подробности:

SECURITY_HEADERS_AND_CORS.md

19. Конфигурация production

Полный набор production-переменных должен включать infrastructure, Telegram, Google Calendar OAuth, payment, service signing secrets и user identity secret.

Infrastructure:

POSTGRES_PASSWORD
REDIS_PASSWORD

Telegram:

TELEGRAM_BOT_TOKEN
ADMIN_TELEGRAM_IDS
TELEGRAM_MODE
TELEGRAM_WEBHOOK_URL
TELEGRAM_WEBHOOK_SECRET

Google Calendar OAuth:

GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
CALENDAR_TOKEN_SECRET

Payment:

YOOKASSA_PROVIDER_TOKEN
PAYMENT_CURRENCY

Service signing secrets:

GATEWAY_SIGNING_SECRET
PAYMENT_SIGNING_SECRET
ANALYTICS_SIGNING_SECRET
ADMIN_SIGNING_SECRET

User identity:

USER_ID_SIGNING_SECRET

Все секреты должны быть случайными значениями длиной не меньше 32 символов.
Секреты должны генерироваться через криптографически стойкий генератор.

Ротация секретов описана в SECRET_ROTATION.md.

19. Хеширование паролей web API

packages/api/src/shared/auth/password.ts использует PBKDF2-SHA512 с 120 000 итерациями.

Правила:

pbkdf2 вызывается асинхронно через promisify и не блокирует event loop
verifyPassword отклоняет хранимые хеши с iterations меньше 100 000
соль создаётся через randomBytes
длина соли — 16 байт

Проверка минимального числа итераций защищает от подделки записей в БД.

20. Защита от path traversal в notification-service

send_document события из Redis обрабатываются с проверкой пути.
Файлы разрешены только из директории /reports.

Алгоритм:

1. определить REPORTS_DIR как /reports
2. взять basename из входного filePath
3. построить safePath внутри REPORTS_DIR
4. проверить, что safePath начинается с REPORTS_DIR
5. отклонить событие при нарушении проверки

Небезопасный filePath логируется и не обрабатывается.

21. Что остаётся для production

ротация GATEWAY_SIGNING_SECRET и других service secrets — рекомендуется
централизованные логи через Loki, Datadog или аналог — желательно
Redis ACL вместо rename-command — желательно
secret scanning provider для pull requests — желательно
re-encrypt существующих Calendar-токенов после смены keyFrom с SHA256 на HKDF — обязательно при деплое на production с данными
настроить Google OAuth на refresh token rotation и обновлять хранимый refresh_token при каждом /refresh-token вызове — желательно для долгоживущих подключений

22. Telegram Webhook Security

В production bot-gateway должен работать в webhook mode.

Правила:

TELEGRAM_WEBHOOK_URL должен быть HTTPS URL
TELEGRAM_WEBHOOK_SECRET должен быть случайным значением длиной не меньше 32 символов
bot-gateway передаёт secret_token в Telegram setWebhook
POST /telegram/webhook проверяет X-Telegram-Bot-Api-Secret-Token
update всё равно проходит Redis idempotency по update_id

Webhook secret защищает endpoint от прямых запросов без Telegram.
Он не заменяет idempotency, rate limiting и бизнес-транзакции.

Связанные документы

SYSTEM_OVERVIEW.md — общий обзор системы
DEPLOYMENT.md — деплой и окружения
QUEUES_AND_EVENTS.md — очереди и события
packages/auth/src/index.ts — исходный код auth helpers
