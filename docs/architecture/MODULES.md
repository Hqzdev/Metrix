Modules

Этот документ объясняет модули проекта.

Что такое module

Module — это кусок системы с понятной ответственностью.

Пример:

- booking module отвечает за брони;
- payment module отвечает за платежи;
- calendar module отвечает за календари.

Правило хорошего module

Он должен:

- иметь понятный вход;
- иметь понятный выход;
- не знать лишнего;
- не смешивать UI, базу и внешние провайдеры без причины.

В bot runtime module чаще всего живет внутри отдельного service.

Shared infrastructure для bot runtime живёт в `apps/bot/packages`.
Пакет туда попадает только если несколько сервисов используют одну и ту же границу:

- contracts между сервисами;
- auth/security primitives;
- Redis bus primitives;
- observability и health helpers;
- audit-log persistence helpers;
- RBAC primitives.

Service-specific workflow остаётся в `apps/bot/services/*`.

В packages/api module живет внутри src/modules.
