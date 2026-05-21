Failure Scenarios

Этот документ объясняет типовые сбои.

Redis down

Что ломается:

- rate limit;
- replay protection;
- queues;
- locks;
- Telegram state.

Ожидание:

опасные flows должны fail safely.

PostgreSQL down

Что ломается:

- брони;
- платежные состояния;
- audit;
- отчеты.

Ожидание:

write flows должны остановиться, пока база не вернется.

Telegram down

Что ломается:

- доставка сообщений;
- polling/webhook updates.

Ожидание:

внутренние данные не должны теряться.
Notification events можно retry-ить.

Payment callback duplicate

Что может случиться:

provider прислал один callback дважды.

Ожидание:

idempotency не дает создать вторую бронь или второй платежный эффект.

Analytics down

Что ломается:

статистика недоступна.

Ожидание:

booking/payment core flow продолжает работать.
