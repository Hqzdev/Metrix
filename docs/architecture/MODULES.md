# Modules

## О чем этот файл

Этот документ описывает доменные модули системы и их ответственность. Он нужен, чтобы не смешивать бронирования, ресурсы, аналитику, интеграции и уведомления в один технический слой.

## Какие модули будут в проекте

- `auth`
- `users`
- `resources`
- `bookings`
- `availability`
- `calendar-integrations`
- `telegram`
- `notifications`
- `analytics`
- `reports`
- `admin`

## Что должно быть описано для каждого модуля

- зона ответственности;
- публичные сценарии;
- входящие и исходящие зависимости;
- основные сущности;
- use cases;
- API или события, через которые модуль общается с другими частями системы.

## Какие файлы будут внутри модулей

Базовый шаблон для каждого доменного модуля:

```txt
src/modules/<module-name>/
  domain/
    entities/
    value-objects/
    events/
  application/
    use-cases/
    dto/
  infrastructure/
    repositories/
    mappers/
    adapters/
  presentation/
    controllers/
    validators/
    serializers/
```

## Примеры реальных файлов

```txt
src/modules/bookings/domain/entities/booking.ts
src/modules/bookings/application/use-cases/create-booking.ts
src/modules/bookings/application/use-cases/cancel-booking.ts
src/modules/bookings/infrastructure/repositories/prisma-booking-repository.ts
src/modules/bookings/presentation/controllers/create-booking-controller.ts

src/modules/resources/domain/entities/room.ts
src/modules/resources/domain/entities/desk.ts
src/modules/availability/application/use-cases/get-available-slots.ts
src/modules/analytics/application/use-cases/get-usage-metrics.ts
```

## Зачем нужен этот файл

Чтобы команда понимала, где заканчивается один модуль и начинается другой, и не плодила случайные связи между несвязанными частями системы.
