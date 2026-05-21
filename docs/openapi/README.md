OpenAPI

Этот раздел объясняет OpenAPI спецификацию.

Что такое OpenAPI

OpenAPI — это машинно-читаемое описание API.

Файл:

docs/openapi/metrix-bot-api.yaml

Зачем он нужен

- показать endpoints;
- описать request/response;
- описать ошибки;
- дать основу для клиентов и contract tests.

Как проверить

npm run openapi:validate

Важно

YAML-файл не переписывается простым языком, потому что это спецификация.
Его нужно менять аккуратно вместе с contracts и tests.
