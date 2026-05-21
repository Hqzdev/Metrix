Database Restore Runbook

Этот документ объясняет восстановление PostgreSQL.

Когда нужен restore

- база повреждена;
- случайно удалены данные;
- миграция сломала схему;
- нужен drill для проверки backup.

Главное правило

Не восстанавливать поверх production без плана.
Сначала восстановить в clean database и проверить.

Шаги

1. Найти нужный backup.
2. Создать clean database.
3. Выполнить pg_restore.
4. Проверить таблицы.
5. Проверить критичные записи.
6. Проверить приложение.
7. Записать RPO/RTO.

Evidence

Результаты restore drill лежат в:

docs/testing/RESTORE_DRILL_EVIDENCE.md
