Restore Drill Evidence

Этот документ фиксирует результаты restore drill.
Не заполнять успешный результат без реального pg_restore в clean database.

Drill 1

Дата:
Проверял:
Окружение:
Backup file:
Clean database:
Command:
Restore result:
Prisma validate:
Critical tables:
Critical records:
RPO:
RTO:
Screenshots:
Follow-up:

Статус:

not executed in this turn

Причина:

runtime database и backup artifact не поднимались в рамках текущего изменения документации.
Чтобы перевести этот drill в passed, нужно выполнить backup, восстановить dump в clean database и заполнить поля выше.

Минимальная команда

DATABASE_URL=postgresql://user:pass@localhost:5432/metrix npm run db:backup
createdb metrix_restore_drill
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$RESTORE_DATABASE_URL" backups/postgres/metrix-YYYYMMDDTHHMMSSZ.dump
npm run prisma:validate

Связанные документы

docs/architecture/BACKUP_STRATEGY.md
docs/testing/PRODUCTION_READINESS_TEST_REPORT.md
