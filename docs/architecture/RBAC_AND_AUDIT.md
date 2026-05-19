RBAC And Audit

Этот документ описывает роли, permissions, policy checks и audit log в Metrix.

Назначение

RBAC нужен, чтобы доступ проверялся не через отдельные boolean-флаги, а через роли и permissions.
Audit нужен, чтобы важные действия можно было расследовать после выполнения, а не только увидеть в stdout во время работы сервиса.

Роли

admin — администратор системы
employee — обычный пользователь
service — доверенный внутренний сервис

Permissions

admin:read — чтение административных данных
admin:write — изменение административных данных
analytics:read — чтение аналитики
booking:create — создание бронирования
booking:read:own — чтение своих бронирований
booking:cancel:own — отмена своих бронирований
calendar:manage:own — управление своим календарём
payment:create — создание платежа
report:create — создание отчёта
report:read — чтение статуса отчёта

Правила ролей

admin получает все user-facing permissions.
employee получает только permissions для собственных бронирований, календаря и платежей.
service используется только для internal service-to-service сценариев.

Telegram RBAC

ADMIN_TELEGRAM_IDS остаётся источником назначения роли admin для Telegram users.

Но бизнес-код не должен проверять:

isAdmin = true

Вместо этого создаётся actor и проверяется permission:

createTelegramActor(userId, adminTelegramIds)
evaluatePolicy(actor, "admin:read")

Такой подход позволяет позже добавить новые роли без переписывания всех handlers.

Policy helpers

Код находится в:

apps/bot/packages/rbac

Основные функции:

createTelegramActor — создаёт actor для Telegram user
createServiceActor — создаёт actor для internal service
can — boolean-проверка permission
evaluatePolicy — decision с причиной отказа
listPermissions — список permissions actor

Audit log

Система использует два уровня audit:

structured stdout audit — быстрый runtime log
persistent PostgreSQL audit — долговременный журнал

Persistent audit model находится в apps/bot/prisma/schema.prisma:

AuditLog

Поля:

id — audit record id
ts — время события
service — сервис-источник
action — действие
actorUserId — пользователь, если применимо
entityType — тип сущности
entityId — id сущности
requestId — request id
callerService — вызывающий сервис
payload — безопасный JSON payload

Правила audit

Audit пишется для:

административных изменений
изменений бронирований
отказов доступа
платёжных переходов
calendar connect/disconnect

bot-gateway пишет denied RBAC decisions как structured audit/log action:

rbac.denied

Audit не должен содержать:

секреты
OAuth tokens
payment provider token
сырые подписи HMAC
персональные данные, которые не нужны для расследования

Ошибка записи persistent audit

Ошибка записи audit log не должна ломать основной бизнес-flow для обычных действий.
Сервис обязан записать structured error log:

audit.persist.failed

Исключение возможно для compliance-critical операций, но это должно быть явно описано рядом с handler.

Чтение audit log

admin-service предоставляет endpoint:

GET /audit-logs

Endpoint поддерживает фильтры service, action, entityType, entityId, requestId, from, to и limit.
Подробные правила чтения, redaction и retention описаны в AUDIT_LOG_POLICY.md.

Расширение

Добавление новой permission:

1. добавить permission в @metrix/rbac
2. назначить permission ролям
3. обновить этот документ
4. заменить точечные проверки в handlers на evaluatePolicy
5. добавить audit для denied decision если действие чувствительное

Добавление нового audit event:

1. выбрать action в формате domain.action
2. указать service
3. указать entityType и entityId
4. удалить секреты из payload
5. описать событие в этом документе или SECURITY.md
