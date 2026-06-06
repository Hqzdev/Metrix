# API Contracts

API contract - это договор между producer-ом данных и consumer-ом. В Metrix
consumer-ами могут быть web-клиент, Telegram gateway, bot microservices,
admin-service, contract tests и внешние интеграции.

## Где лежат contracts

- `apps/bot/packages/contracts` - события, stream payloads и bot service DTO.
- `packages/api/src/contracts` - root API request/response types.
- `docs/openapi/metrix-bot-api.yaml` - OpenAPI spec для публичных HTTP shapes.
- `tests/contracts` - contract tests для сервисных endpoint-ов.

## Что считается contract change

- Добавление, удаление или переименование поля.
- Изменение типа поля или enum value.
- Изменение обязательности поля.
- Новый HTTP status code.
- Новый error shape.
- Новая версия события Redis stream.

## Правило совместимости

Backward-compatible изменения можно выпускать без версии, если старый consumer
продолжает работать. Breaking changes требуют migration plan:

1. Добавить новое поле или endpoint.
2. Обновить consumer-ы.
3. Дождаться deploy всех consumer-ов.
4. Удалить старый shape отдельным PR.

## Checklist изменения response

1. Обновить TypeScript contract.
2. Обновить validator или parser.
3. Обновить OpenAPI spec, если endpoint публичный.
4. Обновить contract tests.
5. Обновить документацию и examples.
6. Проверить, что старые consumer-ы не сломаются без coordinated deploy.

## Error contract

Ошибки должны быть предсказуемыми:

- `400` - invalid input.
- `401`/`403` - auth или permission failure.
- `404` - сущность не найдена.
- `409` - конфликт состояния, например слот уже занят.
- `5xx` - ошибка сервиса или downstream dependency.

Error body должен содержать стабильное поле `error` или documented typed shape,
чтобы web и bot могли показать понятное сообщение пользователю.
