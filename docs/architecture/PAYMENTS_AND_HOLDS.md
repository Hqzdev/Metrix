Payments And Holds

Этот документ объясняет оплату и временное удержание слота.

Проблема

Если два пользователя одновременно начнут платить за один слот, нельзя дать им обоим завершить покупку.

Решение

Перед оплатой создается SlotHold.
Он временно удерживает слот.

Основные сущности

PendingInvoice — invoice, который ждет оплату.
SlotHold — временное удержание слота.
PaymentSaga — состояние всего платежного flow.

SlotHold statuses

- held — слот удержан;
- paid — оплата прошла;
- expired — hold истек;
- cancelled — hold отменен.

PaymentSaga statuses

- pending;
- awaiting_next_part;
- awaiting_booking;
- completed;
- failed;
- compensating;
- compensated.

Почему нужна PaymentSaga

Оплата может состоять из нескольких шагов.
Если сервис упал между оплатой и созданием брони, PaymentSaga помогает восстановиться.

Idempotency

После оплаты booking-service получает idempotency key:

payment:{invoiceId}

Это нужно, чтобы повторный retry не создал вторую бронь.

Recovery

Админ может:

- посмотреть failed saga;
- запустить retry-booking;
- начать compensation;
- отметить saga compensated.

Что еще нужно проверить

Полный end-to-end payment retry через настоящий invoice flow.
