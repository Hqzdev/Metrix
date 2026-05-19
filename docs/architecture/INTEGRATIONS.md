Integrations

Этот документ описывает внешние интеграции системы и правила работы с ними.

Назначение

Интеграции должны быть оформлены как отдельные адаптеры.
Google, Microsoft и Telegram не должны быть размазаны по бизнес-логике.
Доменная логика не должна зависеть от формата внешних API.

Какие интеграции есть

Google Calendar
Microsoft Outlook / Microsoft 365
Telegram Bot

Что описывает документ

механизм авторизации
поддерживаемые действия каждой интеграции
структуру адаптеров
retry policy
обработку временных ошибок
хранение токенов и секретов
маппинг внешних сущностей во внутренние модели

Ожидаемые файлы

src/integrations/google-calendar/google-calendar-adapter.ts
src/integrations/google-calendar/google-calendar-auth.ts
src/integrations/google-calendar/google-calendar-mapper.ts
src/integrations/microsoft-calendar/microsoft-calendar-adapter.ts
src/integrations/microsoft-calendar/microsoft-calendar-auth.ts
src/integrations/microsoft-calendar/microsoft-calendar-mapper.ts
src/integrations/telegram-bot/telegram-bot-client.ts
src/integrations/telegram-bot/telegram-command-router.ts
src/integrations/telegram-bot/telegram-message-builder.ts

Затронутые модули

src/modules/calendar-integrations
src/modules/telegram
src/modules/notifications
src/shared/config

Правила интеграций

Внешние API вызываются только через адаптеры.
Адаптеры не должны содержать бизнес-логику.
OAuth-токены хранятся только в зашифрованном виде.
Ошибки внешних API нормализуются перед передачей в application-слой.
Временные ошибки обрабатываются через retry.
Данные внешних сущностей маппятся во внутренние модели.

Расширение

Добавление новой интеграции:

1. создать adapter
2. описать auth flow
3. описать mapper
4. добавить env-переменные
5. добавить retry policy
6. описать ошибки и ограничения
