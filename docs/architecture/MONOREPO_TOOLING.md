Monorepo Tooling

Этот документ объясняет monorepo.

Что такое monorepo

Это один репозиторий, где лежит несколько приложений и пакетов.

В Metrix есть:

- apps/web;
- apps/bot;
- packages/api;
- packages/shared;
- packages/ui;
- docs;
- tests.

Почему npm workspaces достаточно сейчас

Проект уже может:

- ставить зависимости;
- собирать bot workspaces;
- запускать root scripts;
- проверять API, bot и web отдельно.

Когда нужен Turborepo или Nx

Если станет много пакетов, тяжелые builds и сложный cache.
Пока npm workspaces достаточно и проще.
