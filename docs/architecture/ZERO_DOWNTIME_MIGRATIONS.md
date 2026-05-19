Zero Downtime Migrations

Этот документ описывает migration strategy для PostgreSQL и Prisma в Metrix.
Он нужен, чтобы schema changes не ломали runtime во время deploy и rollback.

Назначение

Zero downtime migration означает, что старая и новая версия приложения могут временно работать с одной схемой БД.
Миграция не должна требовать одновременного выключения web, bot-gateway и микросервисов.

Главное правило

Использовать expand and contract.

Expand — добавить новую схему без удаления старой.
Migrate — заполнить данные и включить dual-read или dual-write.
Contract — удалить старую схему только после того, как старый код больше не работает в production.

Deploy order

1. backup или restore point
2. expand migration
3. deploy кода, который умеет читать старый и новый формат
4. backfill
5. включение write path на новый формат
6. наблюдение за errors, latency и audit
7. contract migration отдельным deploy

Expand examples

Безопасно:

добавить nullable column
добавить table
добавить index concurrently
добавить enum-compatible lookup table
добавить optional relation

Опасно без expand:

rename column
drop column
change column type
добавить NOT NULL без default/backfill
добавить blocking index на большую таблицу
изменить enum, если старый код не знает новое значение

Backfill

Backfill должен быть идемпотентным.
Backfill должен идти batch-ами.
Backfill не должен держать долгие transaction locks.
Backfill должен писать progress в logs.
Если backfill влияет на payment или booking state, нужен audit или incident note.

Prisma policy

Prisma migration должна проверяться до deploy.
Runtime DATABASE_URL идёт через PgBouncer.
Migration DATABASE_URL должен идти напрямую в PostgreSQL, не через transaction pool.
Prisma schema change не должен сразу удалять поле, которое читает текущий production runtime.

Rollback

Rollback кода должен быть возможен после expand migration.
Rollback БД не должен быть первым действием, если новая схема backward-compatible.
Contract migration обычно нельзя откатывать безопасно без restore.

Rollback порядок:

1. остановить rollout новой версии
2. вернуть предыдущий app image
3. оставить expand schema на месте
4. проверить `/ready`, error rate и бизнес-состояние
5. планировать отдельный cleanup после incident

Adding a required column

1. добавить nullable column
2. deploy кода, который пишет column для новых records
3. backfill старых records
4. добавить validation в application layer
5. добавить NOT NULL constraint отдельной migration

Renaming a column

1. добавить новую column
2. deploy dual-write
3. backfill новую column из старой
4. deploy read-from-new fallback-to-old
5. deploy read-from-new only
6. удалить старую column отдельной contract migration

Changing enum-like values

Для production лучше использовать string или lookup table.
Если enum уже используется:

1. добавить поддержку нового значения в код
2. deploy
3. начать писать новое значение
4. убедиться, что старый код не нужен
5. удалить старое значение только отдельным contract step, если provider это безопасно поддерживает

Indexes

Большие indexes должны создаваться без долгой блокировки.
Для PostgreSQL использовать concurrent index strategy там, где это поддержано.
Не добавлять heavy index вместе с application deploy.

Verification

Перед deploy:

npm run prisma:validate

После migration:

проверить `/ready`
проверить 5xx rate
проверить slow queries или latency
проверить audit/payment/booking flows, если migration меняла эти таблицы

Связанные документы

docs/architecture/DATABASE_SCHEMA.md
docs/architecture/BACKUP_STRATEGY.md
docs/architecture/DEPLOYMENT.md
docs/architecture/PRODUCTION_READINESS.md
