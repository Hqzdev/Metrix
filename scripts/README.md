Scripts

Этот документ описывает служебные команды проекта: запуск, сборку, тесты, Prisma и проверки перед commit.

Назначение

Скрипты нужны для локальной разработки и CI.
Они не должны содержать бизнес-логику, реальные секреты или ручные действия, которые нельзя повторить на другой машине.

Команды находятся в package.json.
Папка scripts остаётся местом для будущих отдельных утилит, если npm script станет слишком большим.

Основные команды

npm run dev:web — запускает web-приложение
npm run dev:bot — запускает Telegram-бота
npm run dev:api — запускает TypeScript watch для packages/api

npm run build — собирает api, bot и web
npm run build:api — собирает packages/api
npm run build:bot — собирает Telegram-бота
npm run build:web — собирает Next.js web

npm test — запускает все тесты
npm run test:unit — запускает unit-тесты
npm run test:integration — запускает integration-тесты
npm run test:e2e — запускает e2e-тесты

npm run typecheck — проверяет TypeScript во всех основных app/package
npm run typecheck:api — проверяет packages/api
npm run typecheck:bot — проверяет Telegram-бота
npm run typecheck:web — проверяет web

npm run verify — проверяет Prisma schema, typecheck api и unit-тесты

Prisma

npm run prisma:generate — генерирует Prisma Client
npm run prisma:validate — проверяет schema.prisma
npm run prisma:migrate — применяет dev migration
npm run prisma:seed — запускает seed-данные

Env

Для Prisma-команд нужен DATABASE_URL.

Для очередей и realtime нужен REDIS_URL.

Для Telegram-бота нужны:

* TELEGRAM_BOT_TOKEN
* YOOKASSA_PROVIDER_TOKEN
* PAYMENT_CURRENCY
* ADMIN_TELEGRAM_IDS

Правила

Скрипты должны быть короткими.
Если команда становится длинной, её нужно вынести в отдельный файл внутри scripts.

Нельзя добавлять в scripts реальные токены, пароли или production URL.

Расширение

Добавление нового скрипта:

1. добавить команду в package.json
2. выбрать понятное имя через двоеточие
3. обновить этот README
4. проверить запуск команды локально
