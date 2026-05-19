Telegram Bot bot-gateway

Этот документ описывает блок apps/bot/services/bot-gateway.
Это главный вход Telegram-бота: он принимает сообщения от Telegram, понимает, что нажал или написал пользователь, и передаёт работу нужным сервисам.

Назначение

bot-gateway — это “дверь” между Telegram и нашей системой.

Он не хранит бронирования сам и не считает аналитику сам.
Его задача — поговорить с пользователем в Telegram и позвать нужный сервис:

- booking-service — когда нужно показать локации, комнаты, свободное время или отменить бронь
- payment-service — когда нужно выставить счёт и принять результат оплаты
- calendar-service — когда пользователь подключает или отключает календарь
- analytics-service — когда администратор смотрит статистику
- admin-service — для административных операций

Как работает бот

1. Пользователь пишет команду или нажимает кнопку в Telegram.
2. Telegram отправляет update в bot-gateway.
3. bot-gateway проверяет, не слишком ли часто пользователь отправляет запросы.
4. bot-gateway смотрит, что пришло: сообщение, кнопка, pre-checkout оплаты или успешная оплата.
5. bot-gateway вызывает нужный сервис.
6. Пользователь получает новое сообщение или обновлённое старое сообщение в Telegram.

Режимы получения сообщений

Бот умеет работать в двух режимах:

- polling — bot-gateway сам регулярно спрашивает Telegram, есть ли новые сообщения
- webhook — Telegram сам отправляет новые сообщения на HTTP endpoint bot-gateway

Режим выбирается переменной TELEGRAM_MODE.
Если TELEGRAM_MODE не указан, используется polling.

Защита от повторной обработки

Telegram может прислать один и тот же update повторно.
Чтобы бот не сделал одно действие два раза, bot-gateway сохраняет обработанные update_id в Redis.

Если update уже был обработан, бот пропускает его.
Это важно для оплат, отмен бронирований и любых действий с кнопками.

Состояние пользователя

У бота есть простой сценарий бронирования:

- START — пользователь в главном меню
- SELECT_LOCATION — пользователь выбирает локацию
- SELECT_ROOM — пользователь выбирает комнату или ресурс
- SELECT_TIME — пользователь выбирает свободный слот
- CONFIRM_BOOKING — пользователь подтверждает бронь
- PAYMENT — пользователю отправлен счёт

Это состояние хранится в Redis.
Команда /resume восстанавливает экран, на котором пользователь остановился.

Команды

bot-gateway обрабатывает команды прямо в файле bot.ts.
Отдельной папки apps/bot/src/commands сейчас нет.

Поддерживаются команды:

- /start — открыть главное меню
- /help — показать справку
- /book — начать бронирование
- /slots — начать просмотр свободных слотов
- /resume — продолжить текущий сценарий бронирования
- /my_bookings — показать активные бронирования пользователя
- /calendar — подключить или отключить Google Calendar
- /stats — показать статистику для администратора

Кнопки

Основная работа пользователя идёт через inline-кнопки.
Кнопки создаются в keyboards.ts, а их callback data разбирается в callback-data.ts.

Через кнопки пользователь:

- открывает меню
- выбирает локацию
- выбирает комнату или ресурс
- выбирает время
- подтверждает бронь
- отменяет бронь
- подключает или отключает календарь
- открывает админскую статистику

Платежи

Когда пользователь подтверждает бронь, bot-gateway просит payment-service создать счёт.
Счёт отправляется пользователю через Telegram Payments.

Дальше bot-gateway обрабатывает:

- pre_checkout_query — Telegram спрашивает, можно ли продолжать оплату
- successful_payment — Telegram сообщает, что оплата прошла

Эти события передаются в payment-service.

Админские действия

Команда /stats и кнопка статистики доступны только администраторам.
Список администраторов задаётся через ADMIN_TELEGRAM_IDS.

Если обычный пользователь пытается открыть статистику, bot-gateway отвечает Access denied и пишет отказ в лог.

Зависимости

bot-gateway использует:

- TelegramClient — отправляет запросы в Telegram Bot API
- ServicesClient — ходит во внутренние сервисы
- RedisUserSessionStore — хранит состояние пользователя
- RedisTelegramUpdateStore — хранит offset и обработанные update
- createRateLimiter — ограничивает частоту запросов от одного пользователя
- MetricsRegistry — собирает метрики
- BotGatewayLogger — пишет структурные логи

Где смотреть код

- apps/bot/services/bot-gateway/src/index.ts — запуск сервиса
- apps/bot/services/bot-gateway/src/bot.ts — основная логика бота
- apps/bot/services/bot-gateway/src/telegram-client.ts — работа с Telegram Bot API
- apps/bot/services/bot-gateway/src/services-client.ts — запросы во внутренние сервисы
- apps/bot/services/bot-gateway/src/keyboards.ts — Telegram-кнопки
- apps/bot/services/bot-gateway/src/messages.ts — тексты сообщений
- apps/bot/services/bot-gateway/src/callback-data.ts — формат данных кнопок
- apps/bot/services/bot-gateway/src/user-session-store.ts — состояние пользователя в Redis
- apps/bot/services/bot-gateway/src/telegram-update-store.ts — защита от повторных update
