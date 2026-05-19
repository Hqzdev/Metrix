Backup Strategy

Этот документ описывает backup и restore стратегию для PostgreSQL в Metrix.

Назначение

Production без backup не считается production-ready.
Backup нужен не только для аварии, но и для защиты от ошибочной миграции, случайного удаления данных и повреждения окружения.

Что нужно сохранять

PostgreSQL — основной источник данных
Prisma migrations — история изменения схемы
env/secrets — хранятся в provider secrets, не в backup-файлах
uploaded/generated reports — если reports хранятся вне БД, для них нужен отдельный storage backup

Что не сохраняем в git

backup-файлы
production dumps
секреты
локальные .env

Local backup

Скрипт:

scripts/backup-postgres.sh

Команда:

npm run db:backup

Переменные:

DATABASE_URL — обязательная строка подключения к PostgreSQL
BACKUP_DIR — опциональная директория, по умолчанию backups/postgres

Формат:

pg_dump custom format

Пример:

DATABASE_URL=postgresql://user:pass@localhost:5432/metrix npm run db:backup

Restore

Restore выполняется через pg_restore.

Пример:

pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" backups/postgres/metrix-YYYYMMDDTHHMMSSZ.dump

Restore drill

Команда должна регулярно проверять, что backup действительно восстанавливается.

Минимальный restore drill:

1. создать fresh database
2. восстановить последний backup
3. запустить Prisma validate
4. проверить наличие ключевых таблиц
5. проверить несколько критичных записей

Первый evidence record:

docs/testing/RESTORE_DRILL_EVIDENCE.md

RPO и RTO

Учебный production profile:

RPO — 24 часа
RTO — 4 часа

RPO означает максимальный допустимый объём потери данных.
RTO означает максимальное время восстановления сервиса.

Retention

Минимальная retention policy:

daily backups — 7 дней
weekly backups — 4 недели
monthly backups — 3 месяца

Для локальной разработки retention можно чистить вручную.
Для production retention должен выполнять infrastructure provider или scheduled job.

Правила безопасности

Backup содержит чувствительные данные.
Backup нельзя отправлять в публичные чаты, commit, issue или pull request.
Доступ к backup должен быть не шире доступа к production database.
Перед передачей backup третьей стороне данные должны быть обезличены.

Расширение

Добавление нового storage:

1. описать какие данные в нём хранятся
2. определить backup frequency
3. определить restore procedure
4. добавить storage в restore drill
5. обновить RPO/RTO если storage критичен
