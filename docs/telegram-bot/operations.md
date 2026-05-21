Telegram Bot Operations

Этот документ объясняет эксплуатацию Telegram-бота.

Что проверять

- bot-gateway /health;
- bot-gateway /ready;
- Redis connection;
- Telegram token;
- polling offset;
- duplicate update handling;
- notification-service logs.

Если бот не отвечает

1. Проверить bot-gateway logs.
2. Проверить Redis.
3. Проверить Telegram token.
4. Проверить rate limit.
5. Проверить notification-service.

Если сообщение пришло дважды

Проверить processed update key в Redis.
Повторные updates должны пропускаться безопасно.
