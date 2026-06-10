# Work Log

Этот документ фиксирует маленькие PR, которые уже открыты по новым продуктовым
и инфраструктурным направлениям. Он нужен, чтобы быстро видеть статус работы
без просмотра всех веток вручную.

## 2026-06-06

### Real-time availability

- PR: https://github.com/Hqzdev/Metrix/pull/23
- Branch: `test-availability-hub`
- Commit author: `Muhammadcell <zxcsasa82@gmail.com>`
- Что сделано: добавлены unit tests для `AvailabilityHub`, которые проверяют
  подтверждение подписки и отправку `availability.changed` подходящему клиенту.
- Проверки: `node --import tsx --test tests/unit/api/availability-hub.test.ts`
- Следующий шаг: добавить heartbeat/reconnect guardrails и подключить live updates
  к пользовательскому UI.

### Load testing

- PR: https://github.com/Hqzdev/Metrix/pull/24
- Branch: `test-k6-booking-race`
- Commit author: `abdulluda3 <abdulluda112@gmail.com>`
- Что сделано: добавлен k6 сценарий для одновременного бронирования одного слота
  с ожидаемым результатом `201` для одного запроса и `409` для остальных.
- Проверки: `git diff --check`
- Не запускалось: `k6 run`, потому что k6 не установлен локально.
- Следующий шаг: прогнать сценарий против локального `booking-service` и добавить
  сценарии booking cancellation cycle и payment flow.

### Distributed tracing

- PR: https://github.com/Hqzdev/Metrix/pull/25
- Branch: `docs-tracing-flow`
- Commit author: `Ha1zyy <yarcool2000@gmail.com>`
- Что сделано: описана целевая цепочка span-ов для пользовательского бронирования:
  gateway span, booking business span, database span и downstream HTTP span.
- Проверки: `git diff --check`
- Следующий шаг: добавить недостающие PostgreSQL/Prisma, Redis/BullMQ spans и
  проверить, что один `traceId` связывает Jaeger и Loki.

## Примечания по авторству

Коммиты созданы с авторством участников команды. Ветки запушены через их SSH
hosts. Pull requests открыты текущей GitHub CLI авторизацией `Hqzdev`, потому
что локальный `gh` авторизован под этим аккаунтом.
