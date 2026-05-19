Audit Log Policy

Этот документ описывает чтение, redaction и retention persistent audit log.

Назначение

Audit log нужен для расследований.
Он не должен становиться вторым хранилищем пользовательских данных, секретов или сырых payload внешних провайдеров.

Чтение audit log

admin-service отдаёт защищённый endpoint:

GET /audit-logs

Endpoint доступен только через service-to-service HMAC boundary.
Публичный web или bot boundary должен дополнительно проверять permission admin:read перед проксированием запроса.

Фильтры:

service — сервис-источник события
action — имя audit action
entityType — тип сущности
entityId — id сущности
requestId — request id
from — нижняя граница ts в ISO format
to — верхняя граница ts в ISO format
limit — количество записей, максимум 100
cursor — opaque base64url cursor из ответа nextCursor

Ответ сортируется по ts desc.
actorUserId возвращается строкой, чтобы не терять точность BigInt в JSON.
Если есть следующая страница, ответ содержит nextCursor.
Cursor содержит ts и id последней записи страницы, но клиент не должен разбирать его вручную.

Redaction policy

В payload разрешены:

id сущностей
status transitions
безопасные enum values
технические причины отказа
суммы в minor units
requestId и callerService

В payload запрещены:

пароли
OAuth access token
OAuth refresh token
Telegram bot token
payment provider token
HMAC secrets
сырые HMAC signatures
сырые request headers
полный DATABASE_URL
полные external API responses с credentials

Если поле нужно для расследования, но содержит чувствительные данные, хранить нужно только redacted форму.

Пример:

email: "u***@example.com"
tokenHash: "sha256:..."

Retention policy

Учебный production profile:

audit logs хранятся 180 дней
security incidents хранятся до ручного закрытия incident review
payload должен оставаться минимальным, чтобы retention не создавал лишний privacy risk

План production cleanup:

1. admin-service запускает scheduled cleanup
2. cleanup удаляет audit records старше retention window
3. cleanup логирует audit.retention.cleaned
4. будущий incident workflow должен исключить записи, связанные с открытым incident
5. будущая метрика должна публиковать количество удалённых записей

Runtime configuration:

AUDIT_RETENTION_DAYS — retention window, по умолчанию 180
AUDIT_RETENTION_INTERVAL_MS — cleanup interval, по умолчанию 86400000

Правила расширения

Добавление нового audit event:

1. выбрать action в формате domain.action
2. записывать entityType и entityId
3. добавлять requestId
4. проверить payload по redaction policy
5. обновить SECURITY.md или этот документ
