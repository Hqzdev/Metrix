Telegram Bot Operations and Security

Этот документ описывает требования к безопасности и операционной готовности бота в production: переменные окружения, шифрование токенов, логирование, health checks и uptime monitoring.

Назначение

Документ охватывает только Telegram-бот apps/bot.
Deployment API, базы данных и Redis описаны в docs/architecture/DEPLOYMENT.md.

Требования перед production-деплоем

Каждый пункт обязателен для production:

TELEGRAM_BOT_TOKEN — токен бота из BotFather
YOOKASSA_PROVIDER_TOKEN — токен провайдера платежей
ADMIN_TELEGRAM_IDS — список id администраторов через запятую
CALENDAR_TOKEN_SECRET — секрет шифрования OAuth-токенов, минимум 32 символа
LOG_LEVEL — уровень логирования: info, warn или error
HEALTH_PORT — порт health check сервера
UPTIME_MONITOR_URL — URL для heartbeat

Локальная разработка работает без HEALTH_PORT и UPTIME_MONITOR_URL.
CALENDAR_TOKEN_SECRET имеет встроенный fallback, но не должен использоваться в production.

Переменные окружения

TELEGRAM_BOT_TOKEN

Обязательная переменная.
Содержит токен бота, полученный от BotFather.
Не должна передаваться через аргументы командной строки.

YOOKASSA_PROVIDER_TOKEN

Обязательная переменная.
Содержит токен провайдера платежей YooKassa.
Не должна передаваться через аргументы командной строки.

ADMIN_TELEGRAM_IDS

Обязательная переменная в production.
Содержит числа через запятую.
Пустое значение не даёт прав ни одному пользователю.

PAYMENT_CURRENCY

Необязательная переменная.
По умолчанию используется USD.
Значение должно быть трёхбуквенным кодом ISO 4217.

CALENDAR_TOKEN_SECRET

Обязательная переменная в production.
В локальной разработке необязательна.
Используется для шифрования access_token и refresh_token.
Если значение не задано, применяется небезопасный fallback только для разработки.
Рекомендуемый способ генерации — openssl rand -hex 32.

LOG_LEVEL

Необязательная переменная.
По умолчанию используется info.
Допустимые значения: info, warn, error.
В production рекомендуется info или warn.

HEALTH_PORT

Необязательная переменная.
Определяет порт HTTP-сервера health check.
Если значение не задано, health check сервер не запускается.
Рекомендуемый порт — 3001.

UPTIME_MONITOR_URL

Необязательная переменная.
Содержит URL для heartbeat-пинга каждые 60 секунд.
Если значение не задано, uptime monitoring не запускается.

HTTPS

Telegram Bot API используется в режиме long polling.
Бот сам инициирует HTTPS-запросы к api.telegram.org.
Транспорт всегда зашифрован.

HTTP-сервер health check не должен быть доступен из интернета.

Рекомендуемая схема:

health check сервер слушает только 127.0.0.1
uptime monitor обращается только к внешним heartbeat URL по HTTPS
OAuth redirect URI использует HTTPS в production и настраивается в Google или Microsoft console

Если health check должен быть доступен снаружи, например для load balancer, нужен nginx с TLS-терминацией перед ботом.

Шифрование токенов OAuth

Токены шифруются через AES-256-GCM перед записью в data/calendar-connections.json.

Алгоритм:

IV — 12 случайных байт через crypto.randomBytes
Auth tag — 16 байт GCM
Ключ — SHA-256 от CALENDAR_TOKEN_SECRET

Формат хранения: base64(iv).base64(tag).base64(ciphertext).

Риски при default-секрете:

данные всех установок читаются одним ключом
смена секрета требует удаления data/calendar-connections.json и повторного подключения всех календарей

Смена CALENDAR_TOKEN_SECRET:

1. остановить бота
2. удалить data/calendar-connections.json
3. установить новый CALENDAR_TOKEN_SECRET
4. запустить бота
5. попросить администраторов заново подключить календари

Структурированное логирование

Все уровни логируются в JSON-формате.

Поля каждой записи:

level — info, warn или error
timestamp — ISO 8601
message — строка
дополнительные поля из meta при наличии
error.message, error.name и error.stack при передаче объекта Error

Записи уровня info и warn идут в stdout.
Записи уровня error идут в stderr.

LOG_LEVEL управляет минимальным уровнем вывода.
В production при LOG_LEVEL=warn info-сообщения не выводятся.

Агрегация логов:

Docker — stdout и stderr перехватываются драйвером логирования
systemd — journald собирает вывод автоматически
рекомендуется использовать Datadog, Grafana Loki или аналог с JSON-парсером

Health check

Если задан HEALTH_PORT, бот запускает HTTP-сервер на этом порту.

Маршруты:

GET /health — возвращает 200 OK и тело со статусом ok и uptime_seconds
все остальные пути — возвращают 404

Uptime monitoring

Если задан UPTIME_MONITOR_URL, бот отправляет GET-запрос каждые 60 секунд.
Первый ping происходит при запуске.
Ошибки пинга логируются на уровне warn и не останавливают бот.

Совместимые сервисы:

UptimeRobot — heartbeat monitor
Better Uptime — heartbeat URL
Healthchecks.io — GET ping из коробки

Деплой

Системные требования:

Node.js 20 LTS или выше
файловая система с доступом на запись для data/

Шаги:

1. скопировать .env.example в .env и заполнить все обязательные переменные
2. установить зависимости для apps/bot
3. собрать apps/bot
4. запустить собранный bot runtime

С systemd:

создать unit-файл с переменными из .env
установить Restart=always
направить StandardOutput в journal
направить StandardError в journal

С Docker:

передать переменные через env-file
примонтировать data/ как volume для сохранения данных между перезапусками

Допустимо запускать несколько экземпляров с разными токенами.
Запуск нескольких экземпляров с одним токеном вызовет конфликт long polling.

Расширение

Добавление нового env-параметра:

1. объявить поле в BotEnv
2. добавить чтение и валидацию в readEnv()
3. описать параметр в этом документе

Добавление нового health-маршрута:

1. расширить обработчик запроса в health-server.ts
2. добавить поле в ответ или отдельный путь
