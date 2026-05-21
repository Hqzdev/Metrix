Integrations

Этот документ объясняет внешние интеграции.

Telegram

Telegram используется для bot UX:

- команды;
- inline keyboards;
- уведомления;
- payment flow.

Google Calendar

Google Calendar используется для calendar connections.
OAuth tokens должны быть защищены.

Microsoft Calendar

Архитектура предусматривает Microsoft Calendar.
Реализация должна следовать тем же правилам: OAuth state, token encryption, audit.

YooKassa / Telegram Payments

Payment-service работает с payment flow.
Важные состояния фиксируются в PostgreSQL.

Правило

Внешний provider может прислать callback дважды.
Поэтому обработчики должны быть idempotent.
