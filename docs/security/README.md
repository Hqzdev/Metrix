Security Overview

Этот документ кратко объясняет безопасность Metrix.

Главная мысль

Система защищает не только вход пользователя, но и внутреннее общение сервисов.

Что используется

- HMAC для внутренних запросов;
- replay protection через Redis;
- signed Telegram user id;
- OAuth state signing;
- encryption для calendar tokens;
- RBAC для admin-действий;
- AuditLog для расследований;
- Docker network boundary;
- Redis password;
- disabled dangerous Redis commands.

Что нельзя делать

- открывать PostgreSQL наружу;
- открывать Redis наружу;
- принимать internal request без подписи;
- хранить refresh token открытым текстом;
- replay-ить payment event без проверки.

Главный документ

Подробности лежат в:

docs/architecture/SECURITY.md
