DB Restore Runbook

Этот runbook описывает восстановление PostgreSQL из backup.

Impact

PostgreSQL является source of truth для bookings, payments, holds, invoices, calendar connections и audit.
Restore может потерять данные после backup timestamp в рамках RPO.

Before restore

1. Открыть incident.
2. Зафиксировать причину restore.
3. Остановить write traffic или перевести сервисы в maintenance mode.
4. Сохранить текущие logs и metadata incident.
5. Выбрать backup artifact.
6. Проверить, что backup не повреждён и доступен только авторизованным операторам.

Restore command

Restore выполняется через pg_restore:

pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" backups/postgres/metrix-YYYYMMDDTHHMMSSZ.dump

Validation

1. Запустить Prisma validate.
2. Проверить ключевые таблицы.
3. Проверить несколько критичных Booking records.
4. Проверить PaymentSaga recovery queue.
5. Проверить AuditLog availability.
6. Проверить `/ready` у сервисов.

After restore

1. Зафиксировать фактические RPO и RTO.
2. Заполнить docs/testing/RESTORE_DRILL_EVIDENCE.md.
3. Проверить payment provider events после backup timestamp.
4. Проверить Telegram notifications, которые могли быть отправлены до restore.
5. Открыть follow-up для расхождения внешних provider states и local DB.

Rules

Не делать restore без incident owner.
Не восстанавливать production dump в shared dev environment без redaction.
Не считать restore успешным без application readiness checks.

Связанные документы

docs/architecture/BACKUP_STRATEGY.md
docs/architecture/ZERO_DOWNTIME_MIGRATIONS.md
docs/testing/RESTORE_DRILL_EVIDENCE.md
