Restore Drill Evidence

Этот документ фиксирует restore drill.

Дата: 2026-05-19
Окружение: local Docker Compose

Что делали

1. Создали dump PostgreSQL.
2. Создали отдельную clean database metrix_restore_drill.
3. Восстановили dump через pg_restore.
4. Проверили таблицы и seed-данные.

Результат

Restore прошел успешно.

Проверено:

- 10 таблиц восстановлены;
- booking.Location = 10;
- booking.Resource = 10;
- booking.Booking = 0.

Статус: passed.

Follow-up

Повторить restore drill на отдельной внешней базе и сохранить artifact path.
