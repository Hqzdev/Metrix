API Contracts

Этот документ объясняет API-контракты.

Что такое contract

Contract — это договор между backend и клиентом.

Например:

- какие поля принимает endpoint;
- какие поля возвращает endpoint;
- какие ошибки возможны.

Где лежат contracts

- apps/bot/packages/contracts;
- packages/api/src/contracts;
- docs/openapi/metrix-bot-api.yaml.

Зачем это нужно

Чтобы изменение backend не ломало bot, web или внешнего клиента неожиданно.

Правило изменения

Если меняешь response:

1. Обнови TypeScript contract.
2. Обнови OpenAPI.
3. Обнови tests.
4. Обнови документацию.

Что уже есть

- typed contracts;
- OpenAPI spec;
- OpenAPI validation script;
- contract test для публичных shapes.
