API Analytics

Этот документ описывает будущий блок packages/api/src/modules/analytics и packages/api/src/modules/reports: метрики занятости, utilization, peak hours, admin endpoints и PDF export.

Назначение

Блок analytics считает агрегаты по бронированиям и ресурсам.
Он нужен для админской статистики и отчётов.

В этом слое не должно находиться создание брони, изменение цены ресурса, Telegram UI, OAuth календарей или WebSocket transport.

Структура файлов

src/modules/analytics/analytics-contracts.ts — типы запросов и ответов analytics
src/modules/analytics/analytics-repository.ts — чтение бронирований, ресурсов и слотов из БД
src/modules/analytics/analytics-service.ts — сценарии получения метрик
src/modules/analytics/analytics-calculations.ts — чистые функции расчёта heatmap, utilization и peak hours
src/modules/analytics/analytics-validators.ts — проверка dateFrom, dateTo и filters
src/modules/reports/report-service.ts — создание и получение отчётов
src/modules/reports/report-repository.ts — хранение статуса отчёта
src/modules/reports/report-validators.ts — проверка входа для экспорта
src/queues/report-export-queue.ts — BullMQ очередь генерации PDF

Контракты

Analytics должен вернуть такие DTO:

* OccupancyHeatmapCell — ячейка занятости по date и hour
* ResourceUtilization — процент использования ресурса
* PeakHour — час с высокой загрузкой
* AnalyticsSummary — общая статистика по периоду
* ReportExportRequest — запрос на PDF
* ReportExportStatus — статус генерации отчёта

Occupancy heatmap

Heatmap строится по бронированиям за период.

Ячейка содержит:

* date
* hour
* bookings
* occupiedMinutes
* availableMinutes
* occupancyPercent

Алгоритм:

1. получить бронирования за период
2. убрать cancelled
3. разбить интервалы бронирований по часам
4. посчитать занятые минуты
5. посчитать доступные минуты
6. вернуть массив ячеек

Utilization

Utilization считается по каждому ресурсу.

Формула:

```text
utilizationPercent = occupiedMinutes / availableMinutes * 100
```

Если availableMinutes равен 0, utilizationPercent должен быть 0.

Peak hours

Peak hours показывает часы, когда ресурсы используются чаще всего.

Сортировка:

1. occupancyPercent по убыванию
2. bookings по убыванию
3. hour по возрастанию

Admin endpoints

Все endpoints доступны только администратору.

GET /api/admin/analytics/heatmap — карта занятости
GET /api/admin/analytics/utilization — utilization по ресурсам
GET /api/admin/analytics/peak-hours — пиковые часы
POST /api/admin/reports — поставить PDF-отчёт в очередь
GET /api/admin/reports/{reportId} — получить статус и ссылку на отчёт

Фильтры:

* dateFrom
* dateTo
* locationId
* resourceId
* resourceType

Report export

PDF-отчёт не генерируется внутри HTTP-запроса.

POST /api/admin/reports создаёт report record и добавляет job в report-export queue.
Worker собирает analytics data, генерирует PDF и обновляет статус.

Статусы отчёта:

* pending
* processing
* completed
* failed

Report export queue

report-export-queue.ts должен содержать:

* ReportExportJobData
* createReportExportQueue(connection)
* enqueueReportExportJob(queue, data)
* createReportExportWorker(connection, handler)

Job должна иметь retry и backoff.
Повторная обработка одного reportId должна быть idempotent.

Зависимости

analytics использует:

* Prisma repository
* contracts
* validation
* auth guard на уровне endpoint

reports использует:

* analytics-service
* BullMQ queue
* PDF generator
* report repository

analytics не должен импортировать Telegram bot, calendar adapters или WebSocket hub.

Тесты

Unit-тесты нужны для:

* разбивки бронирований по часам
* формулы utilization
* сортировки peak hours
* обработки пустого периода
* игнорирования cancelled бронирований

Integration-тесты нужны для:

* repository queries
* admin endpoints
* report-export queue

Расширение

Добавление новой метрики:

1. описать DTO
2. добавить validator для filters
3. добавить чистую функцию расчёта
4. добавить метод в analytics-service
5. покрыть unit-тестом
6. подключить endpoint если нужно UI

Добавление нового формата отчёта:

1. расширить ReportExportRequest.format
2. добавить generator
3. добавить обработку в report worker
4. обновить документацию
