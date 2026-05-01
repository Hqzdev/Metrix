Telegram Bot src/services/report

Этот документ описывает блок apps/bot/src/services/report: создание отчётов, фоновая генерация PDF и доставка результата через sendDocument.

Назначение

Блок отвечает за создание PDF-отчётов по аналитике из Telegram-интерфейса администратора.

В этом блоке не должно находиться взаимодействие с Telegram API, бизнес-логика бронирований, расчёт метрик или чтение переменных окружения.

report-service.ts управляет жизненным циклом отчёта: создание записи, переходы статусов, хранение буфера.
report-queue.ts запускает задачи генерации в фоне без блокировки event loop.
pdf-generator.ts собирает PDF из данных аналитики с помощью pdfkit.

Структура файлов

src/services/report-service.ts — типы и in-memory хранилище отчётов
src/services/report-queue.ts — однопоточная in-process очередь задач
src/services/pdf-generator.ts — генерация PDF из аналитических данных

Контракт

report-service.ts экспортирует:

* ReportStatus — 'pending' | 'processing' | 'completed' | 'failed'
* ReportRecord — запись отчёта с id, статусом, буфером и ошибкой
* ReportService — класс управления отчётами

Методы ReportService:

* createReport(filter) — создаёт запись со статусом pending, возвращает ReportRecord
* getReport(reportId) — возвращает запись или undefined
* markProcessing(reportId) — устанавливает статус processing
* markCompleted(reportId, buffer) — устанавливает статус completed, сохраняет буфер
* markFailed(reportId, error) — устанавливает статус failed, сохраняет сообщение ошибки

report-queue.ts экспортирует:

* ReportQueue — класс в-процессной очереди задач

Методы ReportQueue:

* enqueue(reportId, run) — добавляет задачу и запускает обработку если очередь свободна

Задачи выполняются последовательно. Параллельного выполнения нет.
Повторная постановка в очередь одного reportId не выполняется — caller сам отвечает за идемпотентность.

pdf-generator.ts экспортирует:

* generateAnalyticsPdf(data) — собирает PDF и возвращает Promise<Buffer>

Входные данные:

* summary: AnalyticsSummary
* heatmapCells: OccupancyHeatmapCell[]
* utilization: ResourceUtilization[]
* peakHours: PeakHour[]

Статусы отчёта

pending — запись создана, задача в очереди
processing — PDF генерируется
completed — PDF готов, буфер сохранён
failed — ошибка генерации, сообщение записано в error

Переходы:

  createReport → pending
  pending → processing (при старте задачи)
  processing → completed | failed

Назад переходы не предусмотрены.

Flow в Telegram-боте

1. администратор нажимает Export PDF в меню аналитики
2. admin-controller вызывает reportService.createReport(filter)
3. в reportQueue.enqueue ставится задача с reportId
4. бот показывает экран со статусом pending и кнопкой Refresh
5. задача стартует через setImmediate без блокировки бота
6. задача собирает данные через AnalyticsService и вызывает generateAnalyticsPdf
7. результат сохраняется через markCompleted или markFailed
8. администратор нажимает Refresh
9. если completed — бот отправляет PDF через sendDocument и закрывает экран
10. если failed — бот показывает сообщение об ошибке и кнопку возврата

Хранение

Отчёты хранятся в памяти (Map<string, ReportRecord>).
PDF-буфер хранится до перезапуска бота или до явного удаления.
Размер типового отчёта — до 100 КБ.

При перезапуске бота все отчёты теряются. Это ожидаемое поведение первой версии.

Отправка документа

TelegramClient.sendDocument(chatId, buffer, filename) использует multipart/form-data.
Метод не поддерживает редактирование — PDF всегда отправляется как новое сообщение.

Имя файла формируется по шаблону:

  analytics_{dateFrom}_{dateTo}.pdf

Содержимое PDF

Документ содержит следующие секции:

* заголовок с периодом и датой генерации
* сводка: total, active, cancelled, rescheduled, booked time, average, resources used
* heatmap: топ-10 ячеек по occupancyPercent
* utilization: список ресурсов с занятыми минутами и процентом
* peak hours: топ-8 часов по occupancyPercent

Зависимости

report-service.ts зависит от:

* AnalyticsFilter из analytics-service.ts

report-queue.ts не имеет внешних зависимостей.

pdf-generator.ts зависит от:

* pdfkit (npm-пакет)
* типов аналитики из analytics-service.ts

admin-controller.ts зависит от:

* ReportService
* ReportQueue
* AnalyticsService
* TelegramClient (sendDocument)

Безопасность

Создание и просмотр отчётов доступны только администраторам.
reportId генерируется через crypto.randomUUID() и не предсказуем.
PDF не содержит персональных данных пользователей — только агрегаты.

Расширение

Добавление новой секции в PDF:

1. добавить входные данные в тип GeneratePdfInput
2. собрать данные в pdf-generator.ts
3. добавить секцию через doc.text / doc.moveDown

Добавление нового формата отчёта:

1. создать отдельный generator (например csv-generator.ts)
2. добавить ReportFormat тип в report-service.ts
3. роутить по format в обработчике очереди в admin-controller.ts
4. добавить sendDocument или sendMessage в зависимости от формата

Добавление персистентности:

1. заменить in-memory Map на файловое или БД-хранилище
2. сохранять буфер отдельно (файловая система или S3)
3. хранить только ссылку в ReportRecord вместо буфера
