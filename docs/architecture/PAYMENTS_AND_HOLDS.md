Payments And Holds

Этот документ описывает оплату бронирования и временную бронь слота до завершения платежа.

Назначение

Оплата и бронирование не должны расходиться.
Если пользователь получил invoice, слот должен быть временно удержан за ним.
Если оплата прошла, но сервис перезапустился, система должна понять, на каком шаге остановился flow.

Главный вопрос:

что произойдёт, если два пользователя одновременно нажмут оплатить один слот.

Сущности

SlotHold — временная бронь слота до оплаты.
PendingInvoice — текущая часть invoice, которую ждёт Telegram payment flow.
PaymentSaga — состояние платежного сценария между invoice, successful_payment и Booking.
Booking — финальная бронь в booking-service.

PendingInvoice

PendingInvoice не удаляется после оплаты.
Она меняет status, чтобы платежные факты сохранялись для аудита и recovery.

Статусы:

pending — invoice ждёт оплаты
paid_part — часть оплаты принята, создан следующий invoice
completed — invoice полностью оплачен
failed — invoice связан с failed saga или компенсацией
expired — hold истёк до завершения payment flow

SlotHold

SlotHold создаётся в payment-service перед отправкой invoice.
Активный hold имеет status = held и expiresAt в будущем.

Правила:

один active held slot на resourceId + slotId
expired hold переводится в status = expired перед созданием нового hold
после успешного создания Booking hold переводится в status = paid
если hold истёк, pre-checkout отклоняется

Expired hold cleaner

payment-service запускает периодический cleaner.
Он не удаляет SlotHold.
Он переводит status = held в status = expired, если expiresAt уже в прошлом.

Правила:

cleanup interval — 60 секунд
cleanup не создаёт Booking
cleanup не удаляет PendingInvoice
ошибка cleanup логируется и не останавливает payment-service

PaymentSaga

PaymentSaga хранит состояние платежа.
Она нужна для восстановления после retry и падений сервиса.

Статусы:

pending — invoice создан, ждём оплату
awaiting_next_part — оплачена часть, отправлена следующая часть invoice
awaiting_booking — оплата завершена, ждём создание Booking
completed — Booking создан
failed — Booking не создан, нужна компенсация или ручная проверка
compensating — admin запустил ручную компенсацию
compensated — admin подтвердил, что внешняя компенсация завершена

Idempotency

Создание Booking после оплаты использует idempotency key:

payment:{invoiceId}

Если Redis Stream доставит PAYMENT_COMPLETED повторно, booking-service должен вернуть уже созданную бронь, а не создавать дубль.

Синхронный flow

POST /invoices:

1. payment-service проверяет resource в booking-service
2. payment-service проверяет доступность slot в booking-service
3. payment-service истекает старые held holds по этому slot
4. payment-service создаёт SlotHold, PendingInvoice и PaymentSaga в transaction
5. payment-service публикует notification.send для send_invoice

POST /pre-checkout:

1. payment-service находит PendingInvoice
2. проверяет telegramUserId
3. проверяет currency и amount
4. проверяет active SlotHold
5. если hold истёк, отклоняет оплату

POST /successful-payment:

1. payment-service находит PendingInvoice
2. проверяет active SlotHold
3. если платеж разбит на части, создаёт следующий PendingInvoice и продлевает hold
4. если платеж завершён, публикует PAYMENT_COMPLETED
5. PaymentSaga переходит в awaiting_booking

Если invoice оплачен, PendingInvoice получает status = completed.
Если payment разбит на части, старая PendingInvoice получает status = paid_part и supersededByInvoiceId.

Асинхронный flow

PAYMENT_COMPLETED consumer:

1. вызывает booking-service POST /bookings
2. передаёт idempotencyKey = payment:{invoiceId}
3. booking-service создаёт Booking атомарно
4. payment-service переводит SlotHold в paid
5. PaymentSaga переходит в completed
6. публикуется notification.send с подтверждением

Retry

PAYMENT_COMPLETED consumer использует Redis Streams pending retry.
Повторная доставка безопасна, потому что создание Booking получает idempotencyKey = payment:{invoiceId}.

Ошибки

Если slot уже booked, POST /invoices возвращает 409.
Если slot уже held другим invoice, POST /invoices возвращает 409.
Если hold expired, pre-checkout возвращает ok = false.
Если оплата прошла, но Booking не создан, PaymentSaga переходит в failed.

Compensation

Failed saga не должна оставлять слот в held.
Admin-service проксирует ручной recovery action в payment-service:

GET /payment-sagas?status=recovery
GET /payment-sagas/{invoiceId}
POST /payment-sagas/{invoiceId}/compensate
POST /payment-sagas/{invoiceId}/retry-booking
POST /payment-sagas/{invoiceId}/mark-compensated

GET /payment-sagas?status=recovery возвращает queue для operator screen:

failed
compensating
awaiting_booking

payment-service:

1. проверяет, что PaymentSaga существует
2. проверяет, что status = failed
3. переводит PaymentSaga в compensating
4. переводит active SlotHold в cancelled
5. переводит PendingInvoice в failed
6. пишет persistent audit payment.compensation_started
7. отправляет пользователю notification о ручной проверке

Admin recovery

GET /payment-sagas/{invoiceId} возвращает состояние PaymentSaga для диагностики.

POST /payment-sagas/{invoiceId}/retry-booking:

1. разрешён для status = failed или awaiting_booking
2. сбрасывает failureReason
3. переводит saga в awaiting_booking
4. пишет audit payment.booking_retry_requested
5. повторно публикует PAYMENT_COMPLETED

POST /payment-sagas/{invoiceId}/mark-compensated:

1. разрешён только для status = compensating
2. переводит saga в compensated
3. пишет audit payment.compensated

retry-booking нельзя использовать как refund.
Если деньги нужно вернуть пользователю, сначала запускается compensate, затем после внешнего refund оператор вызывает mark-compensated.

Operator UI boundary

Backend-контракты для экранов уже есть:

GET /dlq/streams
GET /dlq?stream={stream}
POST /dlq/replay
GET /payment-sagas?status=recovery
GET /payment-sagas/{invoiceId}
POST /payment-sagas/{invoiceId}/compensate
POST /payment-sagas/{invoiceId}/retry-booking
POST /payment-sagas/{invoiceId}/mark-compensated

Если появится browser admin UI, он должен использовать эти endpoints без прямого доступа к Redis или PostgreSQL.
