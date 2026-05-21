Caching Strategy

Этот документ объясняет, что Metrix хранит в Redis.

Главное правило

Redis — не главная база.
Redis хранит временное operational state.

Что можно хранить в Redis

- replay:{requestId};
- rate limit counters;
- Telegram FSM state;
- processed Telegram update ids;
- polling offset;
- Redis Streams;
- DLQ streams;
- distributed locks;
- BullMQ jobs.

Что нельзя хранить только в Redis

- финальную бронь;
- финальный статус оплаты;
- audit log;
- refresh tokens;
- важную бизнес-историю.

Почему

Redis может быть очищен или временно недоступен.
Важные данные должны восстанавливаться из PostgreSQL или внешнего провайдера.

Что делать при Redis down

Если Redis нужен для safety-critical защиты, сервис должен отказать запрос.
Лучше вернуть ошибку, чем создать дубль брони или пропустить replay protection.
