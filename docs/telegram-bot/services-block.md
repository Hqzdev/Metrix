Telegram Bot src/services

Этот документ описывает блок apps/bot/src/services: интерфейс бронирования, его реализация, генерация слотов и начальные данные.

Назначение

Блок src/services реализует слой бизнес-логики и хранилища бронирований.
Он не зависит от Telegram и не знает о формате сообщений, клавиатурах или HTTP-транспорте.

В этом слое не должно находиться взаимодействие с Telegram API, формирование текстов, генерация ссылок или чтение переменных окружения.

Структура файлов

booking-service.ts — контракт BookingService: типы и интерфейс для всех операций с бронированием
mock-booking-service.ts — реализация BookingService с файловым JSON-хранилищем
booking-slots.ts — генерация временных слотов на текущий день для ресурса
booking-seed.ts — начальные данные: 10 локаций и 50 ресурсов по Москве

Контракт

booking-service.ts экспортирует интерфейс BookingService и типы:

* BookingLocation — локация с адресом и статистикой
* BookingResource — рабочее место с ценой, типом и статусом
* AvailableSlot — временной слот с ISO-датами и форматированным временем
* Booking — запись о бронировании с историей оплаты
* AdminLocationUpdate, AdminResourceUpdate — типы для обновления полей

Методы BookingService:

* listLocations() — список всех локаций
* listResources(locationId) — ресурсы указанной локации
* listAvailableSlots(resourceId) — доступные слоты
* createBooking(input) — создаёт бронирование
* listUserBookings(telegramUserId) — активные бронирования пользователя
* cancelBooking(input) — отменяет бронирование, возвращает null если не найдено
* updateLocation(input) — обновляет поля локации
* updateResource(input) — обновляет поля ресурса

Реализация

mock-booking-service.ts содержит MockBookingService — реализацию BookingService.

Хранение данных:

* локации и ресурсы хранятся в памяти (массивы из booking-seed.ts)
* бронирования хранятся в Map<telegramUserId, Booking[]>
* при первом вызове состояние загружается из JSON-файла (data/booking-store.json)
* каждое изменение сохраняется в файл

FileBookingService — псевдоним MockBookingService, используется в index.ts.

Слоты

booking-slots.ts генерирует три слота на сегодня для любого ресурса:

* утро: 09:00 — 12:00
* день: 13:00 — 17:00
* вечер: 18:00 — 21:00

Идентификатор слота: {resourceId}m, {resourceId}a, {resourceId}e.
Слоты не хранятся — пересчитываются при каждом запросе.

Начальные данные

booking-seed.ts содержит 10 московских локаций и по 5 ресурсов в каждой.
Цена в seed может быть записана как условная долларовая цена вида "$390 / desk / month".
При создании ресурса она умножается на 100 и показывается в рублях: "$390" становится "39 000 ₽".
priceMinorUnits хранит сумму в копейках для оплаты в RUB.
Тип ресурса определяется по строке описания: room, office, team, desk.

Расширение

Добавление метода в BookingService:

1. объявить сигнатуру в интерфейсе booking-service.ts
2. реализовать в MockBookingService
3. вызвать saveStore() после изменения данных

Замена реализации хранилища:

1. создать новый класс, реализующий BookingService
2. передать экземпляр в createBot через опцию bookingService
3. mock-booking-service.ts не трогать

Изменение начальных данных:

* редактировать locations и rawResourcesByLocationId в booking-seed.ts
* при наличии существующего JSON-файла сбросить его вручную
