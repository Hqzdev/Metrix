API Versioning

Этот документ описывает правила версионирования и deprecation для HTTP API Metrix.

Назначение

API versioning нужен, чтобы новые клиенты и старые клиенты могли жить одновременно.
Breaking change не должен выкатываться как тихое изменение существующего контракта.

Границы

Public API:

новые публичные маршруты создаются под /api/v1
breaking changes создаются под новой major version, например /api/v2
старые версии удаляются только после deprecation window

Internal bot services API:

текущие маршруты apps/bot остаются без /api/v1 для совместимости сервисов
новые internal routes обязательно описываются в OpenAPI
breaking change между сервисами требует coordinated deploy

Что считается breaking change

удаление поля из response
переименование поля
изменение типа поля
изменение обязательности поля
изменение успешного status code
ужесточение auth requirements
изменение idempotency behavior

Что не считается breaking change

добавление optional поля в response
добавление нового endpoint
добавление optional query parameter
расширение enum только если клиент обязан игнорировать неизвестные значения

Deprecation policy

Минимальный deprecation window:

internal route — 1 release cycle
public route — 90 дней
webhook contract — 180 дней

Deprecation должен быть описан в:

OpenAPI
API_CONTRACTS.md
release notes
миграционной инструкции для клиента

Правила rollout

1. добавить новую версию рядом со старой
2. обновить OpenAPI
3. обновить клиента
4. включить shadow/read-only проверку если возможно
5. переключить production traffic
6. оставить старую версию на deprecation window
7. удалить старую версию отдельным изменением

Правила ошибок

Error response должен оставаться стабильным внутри major version.
Новые machine-readable error codes можно добавлять только как optional поле.
Удалять или переименовывать error field внутри major version нельзя.

Idempotency

Маршруты платежей, бронирований и webhook должны явно описывать idempotency behavior.
Изменение правила idempotency считается breaking change.

Расширение

Добавление новой API version:

1. создать /api/vN boundary
2. описать отличия от предыдущей версии
3. обновить OpenAPI или создать отдельную спецификацию
4. добавить migration notes
5. обновить clients
