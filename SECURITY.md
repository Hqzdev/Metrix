Security Policy

Этот документ описывает public security policy проекта Metrix.
Подробная модель безопасности находится в docs/architecture/SECURITY.md и docs/security/README.md.

Supported scope

Проект находится в активной разработке.
Security policy применяется к текущему коду репозитория, документации, env templates и deployment configuration.

Security model

Единственная публичная точка входа Telegram runtime — bot-gateway.
Внутренние сервисы apps/bot не должны быть доступны снаружи Docker network.
PostgreSQL и Redis не публикуются наружу.
Service-to-service HTTP-запросы подписываются через HMAC-SHA256.
Replay protection использует X-Request-Id и Redis TTL.
Rate limiting выполняется в Redis.
OAuth state подписывается.
Calendar tokens хранятся в зашифрованном виде.

Secrets

Нельзя коммитить реальные secrets, production tokens, OAuth client secrets, payment provider secrets и Telegram bot tokens.
.env.example должен содержать только безопасные примеры.
Production-секреты должны храниться в provider secrets.

Reporting

Если найден security issue, нужно создать private report владельцу репозитория или передать описание напрямую maintainer.
В публичные issues нельзя добавлять реальные токены, ключи, access logs или персональные данные.

Minimum report content

краткое описание проблемы
затронутая зона проекта
шаги воспроизведения
ожидаемое поведение
фактическое поведение
оценка риска

Связанные документы

docs/architecture/SECURITY.md
docs/architecture/SECURITY_HEADERS_AND_CORS.md
docs/architecture/SECRET_ROTATION.md
docs/security/README.md
