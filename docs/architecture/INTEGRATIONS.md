Integrations

О чем этот файл

Этот документ описывает внешние интеграции системы и правила работы с ними. Он нужен, чтобы Google, Microsoft и Telegram были оформлены как отдельные адаптеры, а не были размазаны по бизнес-логике.

Какие интеграции есть

- Google Calendar
- Microsoft Outlook / Microsoft 365
- Telegram Bot

Что здесь должно быть описано

- механизм авторизации;
- какие действия поддерживает каждая интеграция;
- структура адаптеров;
- политика retry;
- обработка временных ошибок;
- хранение токенов и секретов;
- маппинг внешних сущностей во внутренние модели.

Какие файлы появятся в проекте

```txt
src/integrations/google-calendar/google-calendar-adapter.ts
src/integrations/google-calendar/google-calendar-auth.ts
src/integrations/google-calendar/google-calendar-mapper.ts

src/integrations/microsoft-calendar/microsoft-calendar-adapter.ts
src/integrations/microsoft-calendar/microsoft-calendar-auth.ts
src/integrations/microsoft-calendar/microsoft-calendar-mapper.ts

src/integrations/telegram-bot/telegram-bot-client.ts
src/integrations/telegram-bot/telegram-command-router.ts
src/integrations/telegram-bot/telegram-message-builder.ts
```

Какие модули это затрагивает

```txt
src/modules/calendar-integrations/
src/modules/telegram/
src/modules/notifications/
src/shared/config/
```

Зачем нужен этот файл

Чтобы интеграции были сменяемыми и изолированными, а доменная логика не зависела от формата внешних API.
