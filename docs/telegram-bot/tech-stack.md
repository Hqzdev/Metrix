Telegram Bot Tech Stack

Этот документ объясняет технологии Telegram bot runtime.

Основной язык

TypeScript.

Runtime

Node.js.

База

PostgreSQL через Prisma.

Быстрое временное состояние

Redis.

Очереди

Redis Streams и BullMQ.

Запуск

Docker Compose.

Сервисы

- bot-gateway;
- booking-service;
- payment-service;
- calendar-service;
- analytics-service;
- admin-service;
- notification-service;
- worker-service.

Безопасность

- HMAC;
- replay protection;
- signed user id;
- encrypted tokens;
- RBAC;
- audit log.
