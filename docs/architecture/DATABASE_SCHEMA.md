Database Schema

Этот документ объясняет базу данных Metrix.

Главная идея

PostgreSQL — источник правды.
Если данные нельзя потерять, они должны быть в PostgreSQL, а не только в Redis.

В bot runtime база разделена на schemas:

- booking;
- payment;
- calendar;
- analytics;
- audit.

booking

Здесь лежит все про бронирование.

Location — офисная локация.
Resource — ресурс внутри локации.
Booking — бронь пользователя.
BusySlot — занятый слот.

Главная защита

BusySlot имеет уникальность по resourceId + slotId.
Booking имеет idempotencyKey.

Это помогает не создать дубль.

payment

Здесь лежит все про оплату.

PendingInvoice — invoice, который ждет оплату.
SlotHold — временное удержание слота на время оплаты.
PaymentSaga — состояние платежного процесса.

Зачем нужен SlotHold

Если пользователь начал платить, слот временно удерживается.
Иначе два человека могут попытаться оплатить один слот.

Зачем нужна PaymentSaga

Оплата может состоять из нескольких шагов.
Если сервис упал между шагами, PaymentSaga показывает, что уже произошло и что делать дальше.

calendar

CalendarConnection хранит подключение календаря.
Refresh token хранится зашифрованным.

analytics

Report хранит статус отчета.

audit

AuditLog хранит важные действия.

Примеры audit actions:

- booking.created;
- booking.cancelled;
- payment.booking_retry_requested;
- dlq.replayed;
- location.updated.

Правило изменений

Если меняешь схему:

1. Обнови Prisma schema.
2. Добавь миграцию.
3. Обнови mapper/contracts.
4. Обнови документацию.
5. Проверь typecheck/tests.
