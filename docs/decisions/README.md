Architecture Decision Records

Эта папка хранит engineering decisions по Metrix.
Каждый документ объясняет не только что выбрано, но и почему это выбрано.

Назначение

ADR нужен, чтобы через месяц было понятно:

какая проблема решалась
какие варианты рассматривались
какой trade-off принят
какие последствия есть у решения

Формат

Название:

```
0001-short-decision-name.md
```

Структура:

```
Decision

Context

Options

Decision

Consequences

Status
```

Список решений

0001-use-redis-for-shared-runtime-state.md — Redis для shared state, locks, queues и replay protection
0002-use-hmac-for-service-to-service-auth.md — HMAC-подписи внутренних HTTP-запросов
0003-keep-web-and-bot-runtime-separated.md — разделение web-продукта и Telegram runtime

Правило обновления

Если меняется безопасность, хранилище, очереди, деплой, payment flow или границы сервисов, нужно добавить новый ADR.
