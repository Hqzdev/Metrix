Analytics

Этот документ описывает архитектуру блока analytics: расчёт занятости, utilization, пиковых часов, admin endpoints, PDF reports и фоновые задачи отчётов.

Назначение

Блок analytics нужен для администраторов и операционной команды.
Он показывает, как используются переговорные, рабочие места и локации по дням, часам и ресурсам.

В этом блоке не должно находиться создание бронирований, изменение ресурсов, OAuth календарей или Telegram-логика.
Analytics только читает факты бронирований и строит агрегаты.

Основные сценарии

Администратор открывает dashboard и видит:

* карту занятости по часам и дням
* процент использования каждого ресурса
* пиковые часы бронирований
* общую статистику по статусам бронирований
* выгрузку отчёта в PDF

Frontend запрашивает короткие агрегаты через HTTP API.
Тяжёлый PDF-отчёт создаётся через очередь.

Границы модуля

analytics отвечает за расчёты:

* occupancy heatmap
* utilization percent
* peak booking hours
* admin analytics summary

reports отвечает за экспорт:

* создание PDF
* хранение результата
* статус генерации
* скачивание готового файла

queues отвечает за фон:

* report-export
* analytics-aggregation если появится предрасчёт метрик

Данные

Источник фактов — таблица Booking.

Для расчётов используются поля:

* id
* resourceId
* locationId
* startsAt
* endsAt
* status
* paidAmountMinorUnits
* createdAt
* updatedAt

Для capacity используются Resource и Slot.
Если появится расписание работы ресурса, оно должно стать отдельной таблицей availability rules.

Occupancy heatmap

Heatmap показывает количество или процент занятости по дням и часам.

Минимальная ячейка:

* date
* hour
* bookings
* occupiedMinutes
* availableMinutes
* occupancyPercent

Алгоритм:

1. получить active, completed и rescheduled бронирования за период
2. разбить каждую бронь на часовые интервалы
3. посчитать занятые минуты в каждом часе
4. посчитать доступные минуты по ресурсам
5. вернуть массив ячеек date + hour

Отменённые бронирования не учитываются.

Utilization percent

Utilization показывает процент использования ресурса за период.

Формула:

```text
utilizationPercent = occupiedMinutes / availableMinutes * 100
```

occupiedMinutes считаются по активным и завершённым бронированиям.
availableMinutes считаются по рабочему расписанию ресурса.

Если расписания нет, первая версия может использовать слоты из таблицы Slot.

Peak booking hours

Пиковые часы показывают, в какие часы чаще всего создаются или проходят бронирования.

Для Smart Booking основной показатель — часы проведения бронирований, а не createdAt.

Минимальная запись:

* hour
* bookings
* occupiedMinutes
* occupancyPercent

Сортировка:

1. occupancyPercent по убыванию
2. bookings по убыванию
3. hour по возрастанию

API endpoints

Маршруты доступны только администраторам.

GET /api/admin/analytics/heatmap

Query:

* dateFrom
* dateTo
* locationId?
* resourceId?

Response:

* cells: HeatmapCell[]

GET /api/admin/analytics/utilization

Query:

* dateFrom
* dateTo
* locationId?
* resourceType?

Response:

* resources: ResourceUtilization[]

GET /api/admin/analytics/peak-hours

Query:

* dateFrom
* dateTo
* locationId?

Response:

* hours: PeakHour[]

POST /api/admin/reports

Body:

* dateFrom
* dateTo
* format: pdf
* locationId?

Response:

* reportId
* status

GET /api/admin/reports/{reportId}

Response:

* reportId
* status
* downloadUrl?
* error?

PDF report

PDF-отчёт должен содержать:

* период отчёта
* фильтр по локации если он есть
* summary по бронированиям
* heatmap
* utilization по ресурсам
* peak hours
* дату генерации

PDF не должен генерироваться внутри HTTP-запроса.
HTTP только ставит job в очередь и возвращает reportId.

Очереди

report-export queue:

1. получает reportId и параметры отчёта
2. собирает analytics data через use cases
3. генерирует PDF
4. сохраняет файл или file reference
5. обновляет статус отчёта

analytics-aggregation queue нужна позже, если расчёты станут тяжёлыми.
Первая версия может считать метрики синхронно для dashboard и асинхронно только для PDF.

События

События, которые могут инвалидировать кэш аналитики:

* booking.created
* booking.cancelled
* booking.updated
* resource.updated
* location.updated

Первая версия может не иметь кэша.
Если кэш появится, invalidation должна идти через event handlers.

Структура файлов

packages/api/src/modules/analytics/analytics-contracts.ts
packages/api/src/modules/analytics/analytics-repository.ts
packages/api/src/modules/analytics/analytics-service.ts
packages/api/src/modules/analytics/analytics-calculations.ts
packages/api/src/modules/analytics/analytics-validators.ts
packages/api/src/modules/reports/report-service.ts
packages/api/src/modules/reports/report-repository.ts
packages/api/src/modules/reports/report-validators.ts
packages/api/src/queues/report-export-queue.ts

Контракты могут быть вынесены в packages/api/src/contracts/admin.ts или отдельный contracts/analytics.ts.

Безопасность

Все admin analytics endpoints должны требовать requireAdmin().

Нельзя отдавать персональные данные пользователей в агрегатах.
Если отчёт содержит userId или telegramUserId, это должен быть отдельный admin-only export с явным назначением.

Производительность

Dashboard endpoints должны отвечать быстро.
Цель — до 500 мс для типового периода.

Для больших периодов нужно:

* ограничить date range
* использовать индексы по startsAt, endsAt, resourceId, locationId, status
* выносить PDF и тяжёлые отчёты в BullMQ
* добавить предагрегацию если запросы станут дорогими

Расширение

Добавление новой метрики:

1. описать response contract
2. добавить метод в analytics-service
3. добавить расчёт в analytics-calculations
4. покрыть unit-тестом формулу
5. добавить endpoint если метрика нужна frontend

Добавление нового отчёта:

1. описать request contract
2. добавить report type
3. добавить job handler в report-export queue
4. добавить генератор PDF
5. добавить статус и ссылку скачивания
