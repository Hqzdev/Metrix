Secret Rotation

Этот документ объясняет ротацию секретов.

Зачем менять секреты

Секрет может утечь или устареть.
Система должна уметь перейти на новый секрет без простоя.

Подход current + next

Сервис может принимать два секрета:

- current;
- next.

Сначала добавляем next.
Потом переводим caller на новый secret.
Потом удаляем старый.

Что ротировать

- HMAC service secrets;
- Redis password;
- database password;
- token encryption secret;
- OAuth client secret;
- Telegram webhook secret.

Правило

Не менять все секреты одновременно без плана rollback.
