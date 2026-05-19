OpenAPI Preview

Этот документ описывает способы посмотреть OpenAPI спецификацию локально.

Назначение

OpenAPI-файл полезен как контракт, но команде удобнее читать его через Swagger UI или Redoc preview.
Preview не является runtime dependency проекта.

Файл спецификации

docs/openapi/metrix-bot-api.yaml

Быстрая проверка

Команда:

npm run openapi:validate

Она выполняет lightweight-проверку структуры без внешних npm-зависимостей.

Swagger UI через Docker

Если Docker доступен, можно поднять Swagger UI:

docker run --rm -p 8080:8080 -e SWAGGER_JSON=/spec/metrix-bot-api.yaml -v "$PWD/docs/openapi:/spec" swaggerapi/swagger-ui

После запуска открыть:

http://localhost:8080

Redoc через Docker

Альтернативный preview:

docker run --rm -p 8080:80 -v "$PWD/docs/openapi/metrix-bot-api.yaml:/usr/share/nginx/html/openapi.yaml" -e SPEC_URL=openapi.yaml redocly/redoc

После запуска открыть:

http://localhost:8080

Правила

Preview не должен требоваться для запуска приложения.
Preview не должен хранить секреты.
Preview не должен указывать production credentials.

Расширение

Если команда решит держать static API docs:

1. выбрать Swagger UI или Redoc
2. добавить отдельный docs runtime или static export
3. закрыть production preview auth, если API internal
4. добавить OpenAPI validation в CI
5. обновить docs/openapi/README.md
