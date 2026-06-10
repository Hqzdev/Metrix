# Telegram Services Block

Этот документ описывает сервисы `apps/bot/services/*` и границы между ними.
Bot runtime построен как набор небольших HTTP/Redis сервисов: gateway принимает
Telegram updates, доменные сервисы выполняют работу, а фоновые сервисы
обрабатывают очереди и уведомления.

## Сервисы

| Сервис | Основная зона | Не должен делать |
| --- | --- | --- |
| `bot-gateway` | Принимает Telegram updates, нормализует команды, вызывает внутренние HTTP endpoints. | Хранить платежное или booking состояние. |
| `booking-service` | Создает, читает, отменяет и переносит брони. | Отправлять Telegram сообщения напрямую. |
| `payment-service` | Создает invoice, `SlotHold` и `PaymentSaga`, обрабатывает successful payment. | Самостоятельно подтверждать бронь без booking-service. |
| `calendar-service` | Управляет calendar connections и sync events. | Решать конфликты платежей или слотов. |
| `analytics-service` | Считает метрики и агрегаты для отчетов/дашборда. | Мутировать доменные сущности booking/payment. |
| `admin-service` | Дает operator endpoints: audit, DLQ, recovery и ручные действия. | Быть пользовательским API. |
| `notification-service` | Отправляет Telegram сообщения, invoices и напоминания. | Принимать бизнес-решения по брони. |
| `worker-service` | Выполняет фоновые jobs: отчеты, напоминания, calendar sync. | Дублировать command handling gateway. |

## Каналы взаимодействия

- HTTP используется для синхронных запросов, где caller ждет результат.
- Redis streams используются для событий, retry и фоновой обработки.
- Service-to-service запросы подписываются HMAC secret-ами из env.
- User identity передается только через доверенный подписанный заголовок.

## Правило границ

Каждый сервис отвечает за свою область. Если сервис начинает делать чужую
работу, сначала добавляется contract между сервисами, а не прямой доступ к чужой
логике. Это сохраняет маленькие failure domains и упрощает recovery.

## Recovery

Payment и booking сценарии должны быть идемпотентными:

- повторный Telegram update не должен создавать вторую бронь;
- payment retry должен использовать тот же invoice/payment saga context;
- failed saga переводится в ручной recovery через admin-service;
- DLQ replay запускается только после проверки причины ошибки.

## Чеклист нового сервиса

1. Описать зону ответственности и запреты.
2. Добавить `.env.example` только с нужными secret-ами.
3. Добавить health/ready endpoint.
4. Подключить build в workspace и Dockerfile.service.
5. Добавить contract или unit tests для ключевого поведения.
