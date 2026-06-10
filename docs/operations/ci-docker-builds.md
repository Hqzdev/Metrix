CI Docker builds

Этот runbook нужен, когда падает job `Docker builds` в GitHub Actions.

## Сбой payment-service, run 27071836521

Root cause: `payment-service` не дошел до сборки сервиса. Docker упал на шаге
`load metadata for docker.io/library/node:22-alpine` из-за timeout до Docker Hub:

```text
failed to resolve source metadata for docker.io/library/node:22-alpine
dial tcp registry-1.docker.io:443: i/o timeout
```

Это не payment-service-specific ошибка в коде, Dockerfile или build context.
Все сервисы используют общий `apps/bot/Dockerfile.service`, но matrix jobs
резолвят base image независимо. В этом run один runner поймал transient
network/registry timeout, а остальные сервисные сборки прошли.

## Проверка

1. Открыть failing job log и найти первое `ERROR`.
2. Если ошибка на `node:22-alpine` или `registry-1.docker.io`, считать это
   registry/network failure до анализа кода сервиса.
3. Сравнить соседние matrix jobs. Если другие сервисы с тем же Dockerfile
   проходят, проблема не в `SERVICE_NAME`.
4. Проверить локальную сборку:

```sh
docker build apps/bot --file apps/bot/Dockerfile.service --build-arg SERVICE_NAME=payment-service
```

## Mitigation

- Re-run failed job, если это разовый timeout Docker Hub.
- CI должен повторять `docker build` несколько раз перед hard failure.
- Если timeout повторяется часто, добавить authenticated Docker Hub pull или
  registry mirror/cache для base image.
