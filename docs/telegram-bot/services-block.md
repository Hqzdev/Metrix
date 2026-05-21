Telegram Services Block

Этот документ объясняет сервисы bot runtime.

bot-gateway

Принимает Telegram updates и вызывает внутренние сервисы.

booking-service

Создает, читает и отменяет брони.

payment-service

Создает invoice, hold и PaymentSaga.

calendar-service

Работает с календарными подключениями.

analytics-service

Считает статистику.

admin-service

Дает операторские endpoints: audit, DLQ, recovery.

notification-service

Отправляет Telegram-уведомления.

worker-service

Выполняет фоновые задачи.

Главное правило

Каждый сервис отвечает за свою область.
Если сервис начинает делать чужую работу, архитектура становится сложнее.
