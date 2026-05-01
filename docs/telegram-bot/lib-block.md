Telegram Bot src/lib

Этот документ описывает блок apps/bot/src/lib: вспомогательные утилиты, клиент Telegram API и инфраструктурные модули.

Назначение

Блок src/lib предоставляет низкоуровневую инфраструктуру бота.
Здесь находятся HTTP-клиент для Telegram, типы API, логгер, парсер окружения и утилиты для генерации ссылок.

В этом слое не должна находиться бизнес-логика, работа с хранилищем, формирование текстов или генерация клавиатур.

Структура файлов

telegram-types.ts — TypeScript-типы для объектов Telegram API: обновления, сообщения, callback, платежи, клавиатуры
telegram-client.ts — HTTP-клиент для Telegram Bot API: отправка сообщений, инвойсов, long polling
logger.ts — интерфейс Logger и реализация ConsoleLogger с JSON-сериализацией
env.ts — чтение и валидация переменных окружения
calendar-links.ts — генерация ссылок на Google Calendar и Outlook по данным бронирования

Модули

telegram-types.ts

Содержит только типы, без логики. Экспортирует:

* TelegramUpdate — входящее обновление
* TelegramMessage, TelegramCallbackQuery, TelegramPreCheckoutQuery — типы обновлений
* TelegramUser, TelegramChat — участники
* InlineKeyboardMarkup, InlineKeyboardButton — клавиатуры
* SendMessageOptions, EditMessageOptions, SendInvoiceInput — параметры методов
* TelegramApiResponse — обёртка ответа API

telegram-client.ts

Класс TelegramClient. Принимает токен через конструктор. Все методы выполняют POST-запрос к Telegram Bot API.

Методы:

* getUpdates(options) — long polling, возвращает список обновлений
* sendMessage(chatId, text, options) — отправляет сообщение
* sendInvoice(input) — отправляет инвойс для оплаты
* editMessageText(chatId, messageId, text, options) — редактирует сообщение
* answerCallbackQuery(callbackQueryId, text?) — подтверждает нажатие кнопки
* answerPreCheckoutQuery(preCheckoutQueryId, input) — отвечает на pre-checkout
* setMyCommands() — регистрирует список команд бота

При ошибке API выбрасывает Error с описанием из ответа.

logger.ts

Интерфейс Logger с методами info, warn, error.
ConsoleLogger выводит JSON-строки в console. Ошибки сериализуются в { message, name, stack }.

env.ts

Функция readEnv() читает TELEGRAM_BOT_TOKEN, YOOKASSA_PROVIDER_TOKEN, PAYMENT_CURRENCY, ADMIN_TELEGRAM_IDS.
Выбрасывает Error при отсутствии обязательных токенов.
ADMIN_TELEGRAM_IDS парсится как список чисел через запятую.

calendar-links.ts

Функция createBookingCalendarLinks(booking) возвращает { google, outlook }.
Ссылки формируются из полей Booking: startsAtIso, endsAtIso, locationName, resourceName, priceLabel.

Зависимости

src/lib не импортирует ничего из src/bot, src/commands или src/services.
Это базовый слой — зависимости идут только снизу вверх.

Расширение

Добавление метода в TelegramClient:

1. добавить тип параметров в telegram-types.ts при необходимости
2. реализовать метод через this.request в telegram-client.ts
3. использовать метод в нужном контроллере

Добавление переменной окружения:

1. добавить поле в BotEnv
2. прочитать и валидировать в readEnv
3. передать через опции в нужный модуль
