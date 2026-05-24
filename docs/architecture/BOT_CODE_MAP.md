Bot Code Map

Этот документ объясняет, где искать код Telegram bot runtime.

Главная папка

apps/bot

Сервисы

bot-gateway — вход Telegram updates.
booking-service — брони и слоты.
payment-service — оплата, holds и sagas.
calendar-service — календарные подключения.
analytics-service — статистика.
admin-service — operator/admin endpoints.
notification-service — отправка Telegram сообщений.
worker-service — фоновые задачи.
security-service — JWT, сессии, blacklist, brute-force защита. Порт 3008.

Общие пакеты

auth — подписи, replay, user id.
contracts — общие типы.
redis-bus — streams, retry, DLQ, locks.
health — health/readiness.
observability — metrics.
audit-log — persistent audit.
rbac — роли и права.

Как искать нужное

Если проблема с бронью — booking-service.
Если проблема с оплатой — payment-service.
Если проблема с Telegram update — bot-gateway.
Если проблема с уведомлением — notification-service.
Если проблема с DLQ — admin-service и redis-bus.
Если проблема с метриками — observability и service index.ts.
Если проблема с логином, токенами или сессиями — security-service.
