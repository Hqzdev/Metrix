Testing

Этот раздел объясняет проверки проекта.

Главная мысль

Тесты нужны не для галочки.
Они доказывают, что система работает после изменений.

Основные команды

npm test
npm run typecheck
npm run build
npm run openapi:validate

Типы проверок

Unit tests

Проверяют маленькие функции и модули.

Integration tests

Проверяют взаимодействие сервисов и зависимостей.

E2E tests

Проверяют полный пользовательский flow.

Production readiness checks

Проверяют Docker, health, metrics, backup, incidents и recovery.

Evidence

Если проверка важная, результат нужно записать:

- команда;
- дата;
- результат;
- ошибка, если была;
- follow-up.
