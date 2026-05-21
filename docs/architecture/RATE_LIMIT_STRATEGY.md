Rate Limit Strategy

Этот документ объясняет rate limit.

Зачем нужен rate limit

Он защищает систему от:

- спама;
- случайных повторных нажатий;
- слишком частых Telegram updates;
- перегрузки внутренних сервисов.

Текущее правило

Для Telegram user:

10 requests / 10 seconds.

Как это работает

bot-gateway хранит счетчик в Redis.
Если пользователь делает слишком много запросов, gateway останавливает обработку.

Что делать при Redis down

Если Redis недоступен, безопаснее отказать в rate-limited flow.
Нельзя просто отключить защиту.

Будущее улучшение

Добавить отдельные лимиты для:

- guest users;
- admin users;
- internal service calls;
- payment-sensitive endpoints.
