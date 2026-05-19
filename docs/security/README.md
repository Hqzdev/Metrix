Security Documentation

Этот раздел собирает документы по безопасности Metrix.
Подробная архитектурная модель описана в docs/architecture/SECURITY.md.

Назначение

Документы в этой папке нужны для быстрого ответа на вопросы:

как устроена authentication model
какие сервисы публичные
как работает replay protection
как ограничивается rate
как хранятся secrets
как защищены OAuth tokens
какие события попадают в audit log

Security model summary

Единственная публичная точка входа для Telegram runtime — bot-gateway.
Внутренние сервисы доступны только внутри Docker network.
Service-to-service запросы подписываются через HMAC-SHA256.
Replay protection использует X-Request-Id и Redis TTL.
Telegram user id передаётся через подписанные заголовки.
OAuth state подписывается и проверяется на callback.
Google tokens хранятся в БД только в зашифрованном виде.
Rate limiting выполняется в Redis и переживает рестарт процесса.

Secrets handling

Секреты не хранятся в коде.
.env.example содержит только имена переменных и безопасные примеры.
Production-секреты задаются через provider secrets.
Ротация секретов описана в docs/architecture/SECRET_ROTATION.md.

Security evidence placeholders

Replay protection:

```
Command:
Expected:
Actual:
Screenshot/log:
```

Rate limit:

```
Command:
Expected:
Actual:
Screenshot/log:
```

Invalid service signature:

```
Command:
Expected:
Actual:
Screenshot/log:
```

OAuth state tampering:

```
Command:
Expected:
Actual:
Screenshot/log:
```

Связанные документы

docs/architecture/SECURITY.md
docs/architecture/SECURITY_HEADERS_AND_CORS.md
docs/architecture/SECRET_ROTATION.md
docs/architecture/RBAC_AND_AUDIT.md
docs/architecture/AUDIT_LOG_POLICY.md
SECURITY.md
