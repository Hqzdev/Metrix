# Booking Concurrency

Этот документ фиксирует целевой HTTP contract для optimistic concurrency control.

## Проблема

Два клиента могут одновременно обновить одну бронь. Например, оба отправляют
`PATCH /bookings/{bookingId}` со статусом `cancelled`. Без версии записи второй
запрос может выглядеть успешным, хотя он работал со stale состоянием.

## Целевой contract

Booking responses должны возвращать `ETag`, построенный из версии записи.
Изменяющие запросы должны передавать текущий token в `If-Match`.

Пример:

```http
PATCH /bookings/booking-1
If-Match: "booking-1:7"
Content-Type: application/json

{ "status": "cancelled" }
```

Если версия совпала, сервис применяет обновление и возвращает новый `ETag`.
Если запись уже изменилась, сервис возвращает:

```http
HTTP/1.1 412 Precondition Failed
```

## Следующие изменения в коде

- добавить поле `version` в `booking.Booking`;
- инкрементировать `version` при каждом статусном изменении;
- вернуть `ETag` в `GET /bookings` и `PATCH /bookings/{bookingId}`;
- проверять `If-Match` перед отменой или переносом брони;
- покрыть тестом конфликт двух параллельных отмен одной брони.
