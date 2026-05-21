API Analytics

Этот документ описывает будущий analytics-блок для packages/api.

Текущий статус

Это roadmap-документ.
Файлы packages/api/src/modules/analytics и packages/api/src/modules/reports сейчас не реализованы.

Что должно появиться

- heatmap занятости;
- utilization по ресурсам;
- peak hours;
- summary за период;
- report export;
- очередь генерации PDF.

Будущие endpoints

- GET /api/admin/analytics/heatmap
- GET /api/admin/analytics/utilization
- GET /api/admin/analytics/peak-hours
- POST /api/admin/reports
- GET /api/admin/reports/{reportId}

Главное правило

Analytics не должен создавать брони, менять цены, работать с Telegram UI или напрямую смешиваться с календарными адаптерами.

Как считать utilization

utilizationPercent = occupiedMinutes / availableMinutes * 100

Если availableMinutes = 0, вернуть 0.

Что нужно для реализации

1. Создать contracts.
2. Создать validators.
3. Создать repository.
4. Создать чистые функции расчета.
5. Создать service.
6. Добавить tests.
7. Подключить endpoints.
