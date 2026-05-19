API Contracts

Этот документ описывает будущие HTTP API-контракты системы: маршруты, методы, DTO, коды ответа, ошибки и правила авторизации.

Назначение

Документ нужен для согласования frontend, backend и интеграций до начала активной реализации.
API не должен рождаться случайно внутри кода без общего контракта и понимания моделей клиента.

OpenAPI

Актуальная machine-readable спецификация микросервисной части находится в:

docs/openapi/metrix-bot-api.yaml

Она описывает internal routes apps/bot сервисов, runtime endpoints, базовые DTO и HMAC security scheme.

Если маршрут меняется в коде, OpenAPI обновляется в том же изменении.

Что описывает документ

список маршрутов
HTTP-методы
входные DTO
выходные DTO
коды ответа
ошибки
правила авторизации по маршрутам

Основные группы API

/api/v1/auth — аутентификация
/api/v1/users — пользователи
/api/v1/resources — ресурсы
/api/v1/bookings — бронирования
/api/v1/availability — доступность
/api/v1/integrations — внешние интеграции
/api/v1/analytics — аналитика
/api/v1/reports — отчёты
/api/v1/admin — административные операции

API versioning

Публичный HTTP API должен иметь версию в path.

Правило:

новые публичные routes создаются только под /api/v1
breaking changes создаются под новой версией, например /api/v2
internal service routes apps/bot пока остаются без /api/v1 для совместимости между сервисами
новые internal routes должны быть описаны в OpenAPI даже если они не имеют public version prefix

Подробная deprecation policy описана в API_VERSIONING.md.

Что считается breaking change:

удаление поля из response
переименование поля
изменение типа поля
изменение обязательности поля
изменение status code для успешного сценария
изменение auth requirements

Что не считается breaking change:

добавление необязательного поля в response
добавление нового endpoint
добавление нового enum value только если старые клиенты его игнорируют

HTTP routes

Ожидаемые route handlers:

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

Controllers и validators

Ожидаемые файлы:

src/modules/bookings/presentation/controllers/create-booking-controller.ts
src/modules/bookings/presentation/controllers/update-booking-controller.ts
src/modules/bookings/presentation/validators/create-booking-schema.ts
src/modules/resources/presentation/validators/create-resource-schema.ts

DTO

Ожидаемые файлы:

src/modules/bookings/application/dto/create-booking.dto.ts
src/modules/bookings/application/dto/booking-response.dto.ts
src/modules/analytics/application/dto/usage-metrics.dto.ts
src/modules/analytics/application/dto/occupancy-heatmap.dto.ts
src/modules/analytics/application/dto/resource-utilization.dto.ts
src/modules/analytics/application/dto/peak-hours.dto.ts
src/modules/reports/application/dto/report-export.dto.ts

Analytics endpoints

GET /api/admin/analytics/heatmap — возвращает занятость по дням и часам.
GET /api/admin/analytics/utilization — возвращает процент использования каждого ресурса.
GET /api/admin/analytics/peak-hours — возвращает часы с максимальной загрузкой.
POST /api/admin/reports — создаёт задачу генерации PDF-отчёта.
GET /api/admin/reports/{reportId} — возвращает статус отчёта и ссылку на скачивание.
GET /api/admin/dlq?stream={stream} — возвращает последние сообщения DLQ stream.
GET /api/admin/dlq/streams — возвращает список DLQ streams для operator screen.
POST /api/admin/dlq/replay — возвращает DLQ payload в originalStream или targetStream.
GET /api/admin/payment-sagas?status=recovery — возвращает очередь PaymentSaga для ручного восстановления.
GET /api/admin/payment-sagas/{invoiceId} — возвращает состояние PaymentSaga.
POST /api/admin/payment-sagas/{invoiceId}/compensate — запускает ручную компенсацию failed payment saga.
POST /api/admin/payment-sagas/{invoiceId}/retry-booking — повторяет создание Booking по paid saga.
POST /api/admin/payment-sagas/{invoiceId}/mark-compensated — фиксирует завершённую внешнюю компенсацию.

Все analytics и reports endpoints доступны только администратору.
DLQ replay и PaymentSaga recovery доступны только администратору.

Правила расширения

Добавление endpoint:

1. описать маршрут и метод
2. описать request DTO
3. описать response DTO
4. описать ошибки
5. указать правила авторизации
6. добавить validator и controller

Изменение контракта:

1. обновить документ
2. обновить docs/openapi/metrix-bot-api.yaml
3. обновить DTO
4. обновить frontend-клиент
5. обновить тесты
