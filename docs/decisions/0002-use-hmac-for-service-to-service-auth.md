ADR 0002: Use HMAC For Service-To-Service Auth

Status

Accepted.

Context

Внутренние сервисы вызывают друг друга по HTTP.
Нельзя доверять запросу только потому, что он пришел из сети.

Decision

Подписывать внутренние запросы HMAC.

Подпись покрывает:

- method;
- path;
- timestamp;
- request id;
- body hash.

Consequences

Плюсы:

- сервис проверяет caller;
- replay можно ловить через request id;
- секреты можно ротировать.

Минусы:

- нужно правильно хранить secrets;
- у каждого internal call появляется больше headers;
- тесты должны учитывать подписи.
