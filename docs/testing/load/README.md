Load Testing

Этот документ объясняет нагрузочное тестирование.

Зачем оно нужно

Обычные тесты показывают, что код работает.
Load tests показывают, как система ведет себя под нагрузкой.

Что нужно измерять

- p50 latency;
- p95 latency;
- p99 latency;
- error rate;
- throughput;
- CPU/memory;
- database connection behavior;
- Redis latency.

Главный сценарий

Concurrent booking:

много пользователей пытаются бронировать один или несколько слотов.

## k6 сценарии

Первый сценарий находится в `docs/testing/load/k6/concurrent-booking.js`.

Он проверяет race condition для одного слота:

- один запрос должен создать бронирование (`201`);
- остальные параллельные запросы должны получить защищённый конфликт (`409`);
- p95 latency должен быть ниже 200ms;
- неожиданные HTTP ошибки должны быть ниже 1%.

Пример запуска против локального `booking-service`:

```bash
BOOKING_SERVICE_URL=http://localhost:3001 \
RESOURCE_ID=<resource-id> \
SLOT_ID=<slot-id> \
SERVICE_SIGNING_SECRET=dev-secret \
USER_ID_SIGNING_SECRET=dev-secret \
k6 run docs/testing/load/k6/concurrent-booking.js
```

Что пока не закрыто

Реальные p95/p99/error rate еще не сняты.

Статус: planned.
