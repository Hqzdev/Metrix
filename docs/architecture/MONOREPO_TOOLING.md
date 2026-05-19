Monorepo Tooling

Этот документ описывает monorepo tooling Metrix и почему сейчас достаточно npm workspaces.

Назначение

Monorepo tooling должен давать разработчикам понятные команды, единый dependency boundary и предсказуемые проверки.
Он не должен добавлять orchestrator только ради enterprise perception, если проект ещё не упёрся в cache, affected graph или remote execution.

Текущее решение

Root package.json содержит команды для основных зон:

build
typecheck
test
openapi:validate
verify
dev:api
dev:bot
dev:web

apps/bot/package.json использует npm workspaces:

packages/*
services/*

Это покрывает текущую структуру:

packages/api
apps/web
apps/bot/packages/*
apps/bot/services/*

Почему не Turborepo или Nx сейчас

Проект пока не требует remote cache.
Нет большого числа независимых frontend/backend packages с тяжёлыми build graphs.
CI уже может запускать проверки по зонам: api, bot, web, security.
apps/bot workspaces уже дают локальную сборку packages и services без отдельного orchestrator.
Добавление Turbo/Nx сейчас увеличит maintenance surface: отдельный config, cache invalidation rules, onboarding и CI integration.

Когда добавить Turborepo или Nx

Добавить orchestrator стоит, если появится хотя бы два условия:

1. root build/typecheck станет слишком медленным для обычного pull request
2. нужно запускать checks только для affected packages
3. появятся shared packages между web, bot и API с независимыми release boundaries
4. понадобится remote cache в CI
5. понадобится единый graph для генерации dependency ownership или code owners

Правило принятия решения

Если проблема решается npm script без потери safety, использовать npm script.
Если проблема требует affected graph или cache, добавить ADR перед внедрением Turbo/Nx.

Минимальные команды

Локально перед push:

npm run hook:pre-commit
npm run hook:pre-push

CI:

npm run prisma:validate
npm run typecheck
npm test
npm run openapi:validate

Git hooks

Husky подключён на root уровне.
Hook scripts должны вызывать npm scripts, а не дублировать команды внутри .husky файлов.

pre-commit:

npm run hook:pre-commit

pre-push:

npm run hook:pre-push

pre-commit оставлен быстрым: lint, API typecheck и web typecheck.
pre-push запускает тесты и OpenAPI validation.

Связанные документы

docs/architecture/PRODUCTION_READINESS.md
docs/architecture/API_CONTRACTS.md
docs/openapi/README.md
