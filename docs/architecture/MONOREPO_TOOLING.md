# Monorepo Tooling

Metrix хранит web-клиент, Telegram bot runtime, общие пакеты, Prisma схему,
документацию и тесты в одном репозитории. Цель tooling - дать одинаковые
команды для локальной разработки и CI без лишней платформенной сложности.

## Карта репозитория

- `apps/web` - Next.js web-клиент.
- `apps/bot` - npm workspace для Telegram microservices.
- `packages/api` - общий API/data пакет.
- `packages/*` - shared библиотеки, контракты и UI/helpers.
- `prisma` - root Prisma schema и миграции для API слоя.
- `tests` - root unit, integration и contract tests.
- `docs` - архитектура, эксплуатация и workflow команды.

## Root scripts

Root `package.json` держит команды, которые нужны всей команде:

- `npm run typecheck` - API, bot и web typecheck.
- `npm run typecheck:api` - только `packages/api`.
- `npm run typecheck:bot` - build всех bot workspaces.
- `npm run typecheck:web` - Next typegen и web TypeScript.
- `npm test` - root test suite через `node --test`.
- `npm run openapi:validate` - проверка OpenAPI spec.
- `npm run prisma:validate` - синтаксис и валидность root Prisma schema.

## Web tooling

`apps/web` использует Next.js, React, TypeScript и ESLint:

- `npm --prefix apps/web run dev` - локальный dev server.
- `npm --prefix apps/web run build` - production build.
- `npm --prefix apps/web run typecheck` - Next typegen и `tsc`.
- `npm --prefix apps/web run lint` - web ESLint rules.

TypeScript настройки лежат в `apps/web/tsconfig*.json`. ESLint конфигурация
лежит в `apps/web/eslint.config.mjs`, а prettier правила берутся из root
`prettier.config.js`.

## Bot tooling

`apps/bot` сам является npm workspace. Каждый сервис в `apps/bot/services/*`
имеет собственный `package.json`, но общая команда `npm --prefix apps/bot run
build` собирает все сервисы через workspace scripts.

## Почему npm workspaces достаточно

Сейчас проекту хватает npm workspaces, потому что:

- пакетов еще немного;
- build graph понятен вручную;
- CI jobs разделены по API, bot, web, Docker и contract tests;
- кэширование можно держать на уровне npm и GitHub Actions.

Turborepo или Nx стоит добавлять только когда появятся тяжелые инкрементальные
builds, сложные зависимости между пакетами или заметная экономия от remote cache.
