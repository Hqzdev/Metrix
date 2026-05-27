# Documentation Workflow

Этот документ фиксирует правила работы с документацией Metrix.

## Что коммитить

- изменения README и overview-документов;
- architecture notes для новых сервисов, очередей и интеграций;
- runbooks для повторяемых операций и инцидентов;
- OpenAPI/contract notes, если меняется внешний контракт;
- ADR в `docs/decisions`, если решение влияет на архитектуру.

## Как писать

- один документ должен иметь один понятный фокус;
- ссылки должны вести на существующие файлы;
- устаревшие инструкции нужно обновлять в том же PR;
- большие документы лучше разбивать на обзор и подробные разделы.

## Commit message examples

```text
docs(architecture): document booking service boundaries
docs(operations): add redis outage runbook
docs(openapi): describe booking error responses
```
