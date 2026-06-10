# Transactional Outbox

Этот документ описывает целевой outbox-паттерн для событий бронирования.

## Проблема

`booking-service` сейчас меняет PostgreSQL и затем публикует событие в Redis
Streams. Между этими действиями возможен сбой:

1. транзакция PostgreSQL успешно создала или отменила бронь;
2. процесс упал или Redis временно недоступен;
3. событие `booking.created` или `booking.cancelled` не попало в stream.

В этом случае база уже содержит новый факт, но downstream-сервисы его не увидят:
notification-service не отправит сообщение, analytics-service не обновит метрики,
calendar sync может пропустить изменение.

## Целевое решение

Событие нужно писать в таблицу `outbox.OutboxEvent` в той же PostgreSQL
транзакции, где меняется `booking.Booking`.

Минимальная форма записи:

| Поле | Назначение |
| --- | --- |
| `id` | уникальный event id |
| `aggregateType` | например `booking` |
| `aggregateId` | id брони |
| `eventName` | `booking.created`, `booking.cancelled`, `booking.completed` |
| `payload` | JSON payload для Redis Streams |
| `status` | `pending`, `published`, `failed` |
| `attempts` | сколько раз worker пытался опубликовать событие |
| `nextAttemptAt` | время следующей попытки |
| `publishedAt` | когда событие ушло в Redis |
| `createdAt` | когда событие записано |

Отдельный outbox worker читает `pending` записи, публикует payload в Redis
Streams и помечает запись как `published`. Доставка становится at-least-once:
consumer обязан быть идемпотентным по `eventId`.

## Первые события

Начать стоит с событий, которые уже публикует `booking-service`:

- `stream:booking.created`;
- `stream:booking.cancelled`.

После этого тем же механизмом можно покрыть `stream:booking.completed`, который
сейчас публикуется worker-service после автоматического завершения брони.

## Правила реализации

- Нельзя публиковать Redis событие внутри бизнес-транзакции напрямую.
- `OutboxEvent` пишется до commit вместе с изменением брони.
- Worker делает publish после commit и ретраит временные ошибки Redis.
- Payload должен содержать стабильный `eventId`.
- Consumers должны дедуплицировать `eventId`, потому что доставка at-least-once.
- После превышения лимита попыток запись остаётся в `failed` для ручного replay.

## Проверка готовности

Фича считается готовой, когда тест покрывает сценарий: booking transaction
создала бронь и outbox event, Redis publish временно упал, worker позже
повторил publish без потери события.
