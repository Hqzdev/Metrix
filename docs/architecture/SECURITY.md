Security

Этот документ объясняет безопасность Metrix простым языком.

Главная идея

Система не должна доверять запросу просто потому, что он пришел по сети.
Каждый важный внутренний запрос должен быть проверен.

Что защищаем

- брони;
- платежи;
- Telegram user id;
- refresh tokens календарей;
- admin-действия;
- внутренние сервисы;
- audit log.

HMAC для внутренних сервисов

Когда один сервис вызывает другой, он подписывает запрос секретом.

В подпись входят:

- HTTP method;
- path;
- timestamp;
- request id;
- body hash.

Если подпись неправильная, запрос отклоняется.

Replay protection

Даже правильный запрос нельзя выполнить дважды.

Сервис запоминает X-Request-Id в Redis на короткое время.
Если такой id приходит снова, это replay.

Signed user identity

bot-gateway подписывает Telegram user id.
Внутренний сервис проверяет подпись.

Это нужно, чтобы никто не мог подменить user id вручную.

OAuth state

OAuth state подписывается.
Это защищает redirect flow от подмены данных.

Token encryption

Refresh tokens календаря хранятся зашифрованными.

Rate limit

bot-gateway ограничивает частоту действий пользователя.

Текущее правило:

10 requests / 10 seconds per Telegram user.

RBAC

Admin-команды доступны только администраторам.
Обычный пользователь не должен попасть в admin flow.

Audit log

Важные действия пишутся в audit log:

- создание брони;
- отмена брони;
- payment recovery;
- DLQ replay;
- admin updates;
- forbidden actions.

Docker boundary

PostgreSQL, Redis и внутренние сервисы не публикуются наружу.
Наружу открыт только bot-gateway health port.

Что делать при изменениях

Если добавляешь новый внутренний endpoint:

1. Добавь HMAC-проверку.
2. Добавь replay protection.
3. Проверь user identity, если endpoint действует от имени пользователя.
4. Запиши audit log для опасных действий.
