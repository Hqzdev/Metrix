API Contracts

О чем этот файл

Этот документ описывает будущие HTTP API-контракты системы. Он нужен для согласования frontend, backend и интеграций до начала активной реализации.

Что здесь должно быть описано

- список маршрутов;
- методы;
- входные DTO;
- выходные DTO;
- коды ответа;
- ошибки;
- правила авторизации по маршрутам.

Основные группы API

- `/api/auth`
- `/api/users`
- `/api/resources`
- `/api/bookings`
- `/api/availability`
- `/api/integrations`
- `/api/analytics`
- `/api/reports`
- `/api/admin`

Какие файлы появятся в проекте

HTTP routes

```txt
src/app/api/auth/google/route.ts
src/app/api/resources/route.ts
src/app/api/bookings/route.ts
src/app/api/bookings/[bookingId]/route.ts
src/app/api/availability/route.ts
src/app/api/analytics/usage/route.ts
src/app/api/admin/analytics/heatmap/route.ts
src/app/api/admin/analytics/utilization/route.ts
src/app/api/admin/analytics/peak-hours/route.ts
src/app/api/admin/reports/route.ts
src/app/api/admin/reports/[reportId]/route.ts
```

Controllers и validators

```txt
src/modules/bookings/presentation/controllers/create-booking-controller.ts
src/modules/bookings/presentation/controllers/update-booking-controller.ts
src/modules/bookings/presentation/validators/create-booking-schema.ts
src/modules/resources/presentation/validators/create-resource-schema.ts
```

DTO

```txt
src/modules/bookings/application/dto/create-booking.dto.ts
src/modules/bookings/application/dto/booking-response.dto.ts
src/modules/analytics/application/dto/usage-metrics.dto.ts
src/modules/analytics/application/dto/occupancy-heatmap.dto.ts
src/modules/analytics/application/dto/resource-utilization.dto.ts
src/modules/analytics/application/dto/peak-hours.dto.ts
src/modules/reports/application/dto/report-export.dto.ts
```

Analytics endpoints

GET /api/admin/analytics/heatmap — возвращает занятость по дням и часам.

GET /api/admin/analytics/utilization — возвращает процент использования каждого ресурса.

GET /api/admin/analytics/peak-hours — возвращает часы с максимальной загрузкой.

POST /api/admin/reports — создаёт задачу генерации PDF-отчёта.

GET /api/admin/reports/{reportId} — возвращает статус отчёта и ссылку на скачивание.

Все analytics и reports endpoints доступны только администратору.

Зачем нужен этот файл

Чтобы API не рождался случайно прямо в коде без общего контракта и без понимания, какие модели нужны клиенту.
