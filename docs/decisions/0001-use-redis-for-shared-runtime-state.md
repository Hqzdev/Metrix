Decision

Использовать Redis для shared runtime state: queues, distributed locks, rate limiting, Telegram update idempotency и replay protection.

Context

Metrix состоит из нескольких runtime-сервисов.
Часть состояния должна быть общей между процессами и не может жить в памяти одного Node.js процесса.

Примеры такого состояния:

занятый slot lock во время бронирования
BullMQ queues
rate limit пользователя Telegram
X-Request-Id для replay protection
обработанные Telegram update id
короткоживущие service coordination keys

Options

In-memory cache:

простая реализация
нет внешней зависимости
не работает после рестарта
не работает при нескольких replicas
не подходит для replay protection и locks

PostgreSQL:

надёжное durable storage
удобно для долгоживущих бизнес-данных
слишком тяжёлый путь для частых short-lived keys
хуже подходит для очередей и high-frequency counters

Redis:

shared state между сервисами
TTL keys из коробки
атомарные операции через SET NX, INCR, EXPIRE
нативная база для BullMQ
подходит для horizontal scaling

Decision

Использовать Redis как runtime coordination layer.
PostgreSQL остаётся источником истины для бизнес-данных.
Redis не хранит критичные данные без возможности восстановления из PostgreSQL или внешнего события.

Consequences

Сервисам нужен доступ к Redis в local и production окружениях.
Redis должен иметь health checks и monitoring.
Ключи Redis должны иметь явные namespaces и TTL.
Логика бронирования не должна считать Redis единственным источником истины.
При недоступности Redis сервисы должны возвращать контролируемую ошибку, а не silently bypass protection.

Status

Accepted.
