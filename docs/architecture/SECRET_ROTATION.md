Secret Rotation

Этот документ описывает ротацию секретов Metrix.

Назначение

Секреты не должны жить бесконечно.
Ротация нужна после компрометации, смены окружения, увольнения участника команды, публикации токена в логах или планового security review.

Какие секреты ротируются

Service signing secrets:

GATEWAY_SIGNING_SECRET
PAYMENT_SIGNING_SECRET
ANALYTICS_SIGNING_SECRET
ADMIN_SIGNING_SECRET
USER_ID_SIGNING_SECRET

Infrastructure secrets:

POSTGRES_PASSWORD
REDIS_PASSWORD

Telegram:

TELEGRAM_BOT_TOKEN

Google Calendar OAuth:

GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
CALENDAR_TOKEN_SECRET

Payment:

YOOKASSA_PROVIDER_TOKEN

Общее правило

Секреты хранятся только в provider secrets или локальном .env.
Секреты не попадают в git, docs, issue, pull request, screenshots или logs.

Service signing secret rotation

Service-to-service подпись использует секрет вызывающего сервиса.
Принимающий сервис хранит TRUSTED_*_SECRET.
Для окна ротации принимающий сервис может хранить TRUSTED_*_SECRET_NEXT.
Верификация принимает подпись по current или next secret.

Безопасная ротация:

1. сгенерировать новый секрет
2. добавить его в принимающие сервисы как TRUSTED_*_SECRET_NEXT
3. обновить секрет вызывающего сервиса
4. убедиться, что новые запросы проходят
5. удалить старый секрет из принимающих сервисов
6. перенести next secret в TRUSTED_*_SECRET
7. проверить health, ready и error logs

Текущий режим dual-read

@metrix/auth поддерживает массив trusted secrets для одного caller.
Service config читает TRUSTED_*_SECRET и опциональный TRUSTED_*_SECRET_NEXT.

Ограничение:

исходящий сервис всё ещё подписывает запросы одним current signing secret.
Поэтому окно ротации строится через dual-read на принимающей стороне.

USER_ID_SIGNING_SECRET

USER_ID_SIGNING_SECRET подписывает X-User-Id.
Ротация должна быть синхронной между bot-gateway и принимающими сервисами.

CALENDAR_TOKEN_SECRET

CALENDAR_TOKEN_SECRET шифрует OAuth tokens.
Его нельзя просто заменить без re-encryption существующих токенов.

Правильная ротация:

1. добавить новый key version
2. расшифровать токен старым ключом
3. зашифровать новым ключом
4. сохранить key version
5. удалить старый ключ после завершения миграции

Текущий режим:

key version для calendar tokens не реализован.
Перед production-ротацией нужен re-encrypt migration.

Telegram token

TELEGRAM_BOT_TOKEN ротируется через BotFather.

Порядок:

1. создать новый token
2. обновить provider secret
3. перезапустить bot-gateway
4. проверить polling или webhook
5. отозвать старый token

Redis password

Redis password меняется coordinated deploy:

1. остановить сервисы
2. поменять REDIS_PASSWORD
3. перезапустить Redis
4. перезапустить сервисы
5. проверить /ready

PostgreSQL password

PostgreSQL password меняется через database provider.

Правила:

не менять password во время миграции
проверить backup перед ротацией
обновить DATABASE_URL во всех сервисах
проверить /ready после deploy

Emergency rotation

Если секрет попал в публичный доступ:

1. отозвать секрет у provider
2. создать новый секрет
3. обновить affected services
4. проверить audit logs
5. проверить access logs
6. описать incident timeline
7. удалить публичный артефакт, но считать секрет скомпрометированным навсегда

Частота плановой ротации

Учебный production profile:

service signing secrets — раз в 90 дней
database password — раз в 180 дней
Redis password — раз в 180 дней
Telegram token — при incident
OAuth client secret — при incident или смене owner
payment provider token — при incident или смене owner

Расширение

Добавление нового секрета:

1. добавить имя в .env.example
2. описать owner
3. описать rotation procedure
4. описать blast radius
5. обновить этот документ
