Modules

Этот документ описывает доменные модули системы и их ответственность.
Он нужен, чтобы не смешивать бронирования, ресурсы, аналитику, интеграции и уведомления в один технический слой.

Назначение

Модуль — это область бизнес-ответственности.
Каждый модуль должен иметь ясные публичные сценарии, собственные use cases и ограниченные зависимости.

Какие модули будут в проекте

auth — аутентификация и сессии
users — пользователи и профили
resources — переговорные, рабочие места и их параметры
bookings — создание, отмена и изменение бронирований
availability — расчёт доступности и слотов
calendar-integrations — подключения календарей и синхронизация
telegram — Telegram-сценарии и команды
telegram-session — FSM-состояние Telegram-пользователя
notifications — напоминания и delivery
analytics — расчёт метрик и агрегатов
reports — экспорт отчётов
admin — административные операции

Что описывается для каждого модуля

зона ответственности
публичные сценарии
входящие и исходящие зависимости
основные сущности
use cases
API или события, через которые модуль общается с другими частями системы

Базовая структура модуля

src/modules/<module-name>/domain — сущности, value objects и доменные события
src/modules/<module-name>/application — use cases и DTO
src/modules/<module-name>/infrastructure — repositories, mappers и adapters
src/modules/<module-name>/presentation — controllers, validators и serializers

Примеры файлов

src/modules/bookings/domain/entities/booking.ts
src/modules/bookings/application/use-cases/create-booking.ts
src/modules/bookings/application/use-cases/cancel-booking.ts
src/modules/bookings/infrastructure/repositories/prisma-booking-repository.ts
src/modules/bookings/presentation/controllers/create-booking-controller.ts
src/modules/resources/domain/entities/room.ts
src/modules/resources/domain/entities/desk.ts
src/modules/availability/application/use-cases/get-available-slots.ts
src/modules/analytics/application/use-cases/get-usage-metrics.ts
src/modules/analytics/application/use-cases/get-occupancy-heatmap.ts
src/modules/analytics/application/use-cases/get-resource-utilization.ts
src/modules/analytics/application/use-cases/get-peak-hours.ts
src/modules/reports/application/use-cases/create-report-export.ts

Analytics module

analytics отвечает только за чтение фактов бронирований и расчёт агрегатов.

Основные use cases:

getOccupancyHeatmap
getResourceUtilization
getPeakHours
getAnalyticsSummary

reports отвечает за export.
PDF-отчёты создаются через очередь, а не внутри HTTP-запроса.

Правила зависимостей

domain не зависит от infrastructure и presentation.
application вызывает domain и работает с интерфейсами.
infrastructure реализует интерфейсы хранения и внешних API.
presentation преобразует HTTP или UI-вход в use case input.

Зачем нужен документ

Документ фиксирует, где заканчивается один модуль и начинается другой.
Случайные связи между несвязанными частями системы запрещены.
