Telegram Bot Operations and Security

Этот документ описывает требования к безопасности и операционной готовности бота в production: переменные окружения, шифрование токенов, логирование, health checks и uptime monitoring.

Назначение

Документ охватывает только Telegram-бот (apps/bot).
Deployment API, базы данных и Redis описаны в docs/architecture/DEPLOYMENT.md.

Требования перед production-деплоем

Каждый пункт обязателен для production:

* TELEGRAM_BOT_TOKEN — токен бота из BotFather
* YOOKASSA_PROVIDER_TOKEN — токен провайдера платежей
* ADMIN_TELEGRAM_IDS — список id администраторов через запятую
* CALENDAR_TOKEN_SECRET — секрет шифрования OAuth-токенов (min 32 символа)
* LOG_LEVEL — уровень логирования (info, warn, error)
* HEALTH_PORT — порт health check сервера (например 3001)
* UPTIME_MONITOR_URL — URL для heartbeat (например UptimeRobot)

Локальная разработка работает без HEALTH_PORT и UPTIME_MONITOR_URL.
CALENDAR_TOKEN_SECRET имеет встроенный fallback, но не должен использоваться в production.

Переменные окружения

TELEGRAM_BOT_TOKEN
  обязательная
  токен бота, полученный от BotFather
  не передавать через аргументы командной строки

YOOKASSA_PROVIDER_TOKEN
  обязательная
  токен провайдера платежей YooKassa
  не передавать через аргументы командной строки

ADMIN_TELEGRAM_IDS
  обязательная в production
  числа через запятую: 123456,789012
  пустое значение не даёт прав ни одному пользователю

PAYMENT_CURRENCY
  необязательная, по умолчанию USD
  трёхбуквенный код ISO 4217

CALENDAR_TOKEN_SECRET
  обязательная в production, необязательная локально
  используется для шифрования access_token и refresh_token
  если не задана — применяется небезопасный fallback только для разработки
  рекомендуемый способ генерации: openssl rand -hex 32

LOG_LEVEL
  необязательная, по умолчанию info
  допустимые значения: info, warn, error
  в production рекомендуется info или warn

HEALTH_PORT
  необязательная
  порт HTTP-сервера health check
  если не задана — health check сервер не запускается
  рекомендуемый порт: 3001

UPTIME_MONITOR_URL
  необязательная
  URL для heartbeat-пинга каждые 60 секунд
  если не задана — uptime monitoring не запускается
  пример для UptimeRobot: https://heartbeat.uptimerobot.com/m123-abc

HTTPS

Telegram bot API используется в режиме long polling.
Бот сам инициирует HTTPS-запросы к api.telegram.org — транспорт всегда зашифрован.
HTTP-сервер health check не должен быть доступен из интернета.

Рекомендуемая схема:

* health check сервер слушает только 127.0.0.1
* uptime monitor обращается только к внешним heartbeat URL (HTTPS)
* OAuth redirect URI должен использовать HTTPS в production (настраивается в Google / Microsoft console)

Если health check должен быть доступен снаружи (например для load balancer), нужен nginx с TLS-терминацией перед ботом.

Шифрование токенов OAuth

Токены шифруются через AES-256-GCM перед записью в data/calendar-connections.json.

Алгоритм:

* IV: 12 случайных байт через crypto.randomBytes
* Auth tag: 16 байт (GCM)
* Ключ: SHA-256 от CALENDAR_TOKEN_SECRET

Формат хранения: base64(iv).base64(tag).base64(ciphertext)

Риски при default-секрете:

* данные всех установок читаются одним ключом
* смена секрета требует удаления data/calendar-connections.json и повторного подключения всех календарей

Смена CALENDAR_TOKEN_SECRET:

1. остановить бота
2. удалить data/calendar-connections.json
3. установить новый CALENDAR_TOKEN_SECRET
4. запустить бота
5. попросить администраторов заново подключить календари

Структурированное логирование

Все уровни логируются в JSON-формат.

Поля каждой записи:

* level — info, warn, error
* timestamp — ISO 8601
* message — строка
* дополнительные поля из meta при наличии
* error.message, error.name, error.stack при передаче объекта Error

Записи уровня info и warn идут в stdout.
Записи уровня error идут в stderr.

LOG_LEVEL управляет минимальным уровнем вывода.
В production при LOG_LEVEL=warn — info-сообщения не выводятся.

Пример записи:

  {"level":"info","timestamp":"2026-04-30T10:00:00.000Z","message":"Telegram bot started"}

Агрегация логов:

* Docker: stdout/stderr перехватывается драйвером логирования
* systemd: journald собирает вывод автоматически
* рекомендуется: Datadog, Grafana Loki или аналог с JSON-парсером

Health check

Если задан HEALTH_PORT, бот запускает HTTP-сервер на порту.

Маршруты:

  GET /health
    ответ: 200 OK
    тело: {"status":"ok","uptime_seconds":N}

  все остальные пути: 404

Uptime monitoring

Если задан UPTIME_MONITOR_URL, бот отправляет GET-запрос каждые 60 секунд.
Первый ping происходит при запуске.
Ошибки пинга логируются на уровне warn и не останавливают бот.

Совместимые сервисы:

* UptimeRobot — heartbeat monitor, URL вида heartbeat.uptimerobot.com/m...
* Better Uptime — аналогично, heartbeat URL
* Healthchecks.io — поддерживает GET ping из коробки

Деплой

Системные требования:

* Node.js 20 LTS или выше
* файловая система с доступом на запись для data/

Шаги:

1. скопировать .env.example в .env и заполнить все обязательные переменные
2. npm install --prefix apps/bot
3. npm run build --prefix apps/bot
4. запустить: node apps/bot/dist/index.js

С systemd:

* создать unit-файл с переменными из .env
* Restart=always
* StandardOutput=journal
* StandardError=journal

С Docker:

* передать переменные через --env-file .env
* примонтировать data/ как volume для сохранения данных между перезапусками

Допустимо запускать несколько экземпляров с разными токенами.
Запуск нескольких экземпляров с одним токеном вызовет конфликт long polling.

Расширение

Добавление нового env-параметра:

1. объявить поле в BotEnv
2. добавить чтение и валидацию в readEnv()
3. описать в этом документе

Добавление нового health-маршрута:

1. расширить обработчик запроса в health-server.ts
2. добавить поле в ответ или отдельный путь
