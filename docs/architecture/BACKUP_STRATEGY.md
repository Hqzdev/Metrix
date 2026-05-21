Backup Strategy

Этот документ объясняет backup и restore.

Главная идея

Backup нужен не для галочки.
Он нужен только если restore реально проверен.

Что сохраняем

PostgreSQL.

Почему PostgreSQL

Там лежит источник правды:

- брони;
- платежные состояния;
- календарные подключения;
- audit log;
- отчеты.

Redis не считается долговременным хранилищем.

Команда backup

npm run db:backup

Restore drill

Restore drill — это проверка, что dump можно восстановить в чистую базу.

Уже есть evidence:

docs/testing/RESTORE_DRILL_EVIDENCE.md

Что проверять после restore

- таблицы существуют;
- критичные записи на месте;
- Prisma validate проходит;
- приложение может подключиться;
- RPO/RTO записаны.

Правило

Не писать "backup готов", пока restore не проверен.
