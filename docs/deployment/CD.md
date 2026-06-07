# Continuous Deployment

## Обзор

CD pipeline автоматически доставляет каждый коммит в `main` на production после прохождения CI и smoke-тестов на staging. Ручное действие не требуется, но есть два явных gates.

```
CI (typecheck + tests + openapi + audit + contracts)
          │
          ▼
   build-push → GHCR (sha-<commit> + latest)
          │
          ▼
   deploy-staging (SSH + docker compose pull + rolling restart)
          │
          ▼
   smoke-staging (integration tests против staging URL)
          │
          ▼
   [manual approval — GitHub Environment: production]
          │
          ▼
   deploy-production (SSH + docker compose pull + rolling restart)
          │
          ▼
   smoke-production
          │
    pass ─┤─ fail
          │        │
          ▼        ▼
        done   rollback-production (redeploys previous tag)
```

## Файл

`.github/workflows/cd.yml` — запускается через `workflow_run` после успешного CI.

## Образы

Каждый сервис публикуется в GHCR:

```
ghcr.io/hqzdev/metrix/<service-name>:sha-<git-sha>
ghcr.io/hqzdev/metrix/<service-name>:latest
```

Тег `sha-<git-sha>` иммутабелен. `latest` всегда указывает на последний задеплоенный коммит.
GHCR/Docker repository path должен быть lowercase, иначе `docker buildx`
завершится ошибкой `repository name must be lowercase`.

## Окружения

В GitHub Settings → Environments нужно создать два окружения:

| Окружение   | Required reviewers | URL                              |
|-------------|-------------------|----------------------------------|
| `staging`   | нет               | https://staging.metrixplatform.com |
| `production`| ≥ 1 reviewer      | https://metrixplatform.com       |

`production` с required reviewers — это и есть ручной approval gate.

Если SSH secrets или `DEPLOY_PATH` не настроены, pipeline только соберёт и
опубликует GHCR images, а SSH deploy jobs будут skipped с notice в CD run.
Это защищает `main` от красного CD в репозиториях без подключённых серверов.

## Необходимые секреты

Добавить в GitHub Settings → Secrets → Actions:

| Секрет                 | Описание                                           |
|------------------------|----------------------------------------------------|
| `SSH_HOST_STAGING`     | IP или hostname staging-сервера                   |
| `SSH_HOST_PRODUCTION`  | IP или hostname production-сервера                |
| `SSH_USER`             | SSH-пользователь на обоих серверах                |
| `SSH_PRIVATE_KEY`      | Приватный ключ (без passphrase)                   |
| `SSH_KNOWN_HOSTS`      | `ssh-keyscan staging_host production_host`        |
| `POSTGRES_PASSWORD`    | Передаётся в docker env при деплое                |
| `REDIS_PASSWORD`       | Передаётся в docker env при деплое                |
| `JWT_SECRET`           | Передаётся в docker env при деплое                |
| `SERVICE_HMAC_SECRET`  | Передаётся в docker env при деплое                |

Необходимые переменные (Settings → Variables → Actions):

| Переменная    | Описание                                      |
|---------------|-----------------------------------------------|
| `DEPLOY_PATH` | Абсолютный путь к репозиторию на сервере, например `/srv/metrix` |

## Rollback

Rollback происходит автоматически, если smoke-тесты на production падают. Pipeline берёт тег из файла `.previous-deployed-tag` на сервере и делает `docker compose up` с этим тегом.

Ручной rollback через `workflow_dispatch`:

1. Actions → CD → Run workflow
2. Environment: `production`
3. Image tag: нужный `sha-<git-sha>`

## Структура деплоя на сервере

```
/srv/metrix/apps/bot/
  docker-compose.yml
  .env                      # секреты — никогда в git
  .last-deployed-tag        # текущий тег
  .previous-deployed-tag    # предыдущий тег (для rollback)
```

## Добавление нового сервиса

1. Добавить имя сервиса в матрицу `build-push` в `cd.yml`.
2. Добавить имя сервиса в команды `docker compose up` в шагах `deploy-staging` и `deploy-production`.
3. Добавить `image: ${IMAGE_PREFIX:-ghcr.io/hqzdev/metrix}/<service-name>:${IMAGE_TAG:-latest}` в `docker-compose.yml`.
4. Добавить `OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318` в environment нового сервиса в `docker-compose.yml`.
