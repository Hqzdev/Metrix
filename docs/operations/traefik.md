# Reverse proxy: Traefik

## Что это и зачем

Traefik — единая точка входа для всего HTTP-трафика. До него каждый сервис пробрасывал свой порт
на хост (`3007`, `3010`, `9090` и т.д.). Это не масштабируется: при десятке сервисов нужно помнить,
что на каком порту, и настраивать firewall по каждому.

С Traefik: один порт `80` снаружи, остальные сервисы доступны по субдомену.

## Как запустить локально

```bash
docker compose up traefik
```

Traefik Dashboard: `http://localhost:8080` — показывает все роутеры и сервисы в реальном времени.

| URL | Сервис |
|---|---|
| `http://bot.localhost` | bot-gateway (Telegram webhook) |
| `http://grafana.localhost` | Grafana дашборды |
| `http://errors.localhost` | GlitchTip error tracking |
| `http://dashboard.localhost` | Internal dashboard |
| `http://minio.localhost` | MinIO Console |
| `http://minio-api.localhost` | MinIO S3 API |
| `http://localhost:8080` | Traefik Dashboard |

Субдомены `*.localhost` резолвятся в `127.0.0.1` автоматически на macOS и Linux без `/etc/hosts`.

## Как это работает

### Статическая конфигурация

`traefik/traefik.yml` — читается один раз при старте:
- `providers.docker` — Traefik слушает Docker events и читает labels контейнеров
- `providers.file` — Traefik читает YAML-файлы из `traefik/dynamic/`
- `entryPoints.web` — слушает порт 80

### Динамическая конфигурация

`traefik/dynamic/middlewares.yml` — подхватывается без рестарта (`watch: true`):
- `secure-headers` — добавляет заголовки безопасности (XSS, clickjacking)
- `webhook-rate-limit` — 60 req/s для Telegram webhook endpoint
- `admin-rate-limit` — 20 req/s для Grafana, GlitchTip, dashboard

### Docker Labels

Каждый сервис объявляет свои маршруты через labels в docker-compose.yml:

```yaml
labels:
  - 'traefik.enable=true'
  - 'traefik.http.routers.my-service.rule=Host(`my-service.localhost`)'
  - 'traefik.http.routers.my-service.entrypoints=web'
  - 'traefik.http.services.my-service.loadbalancer.server.port=3000'
  - 'traefik.http.routers.my-service.middlewares=secure-headers@file'
```

`traefik.enable=true` обязателен — `exposedByDefault: false` в конфиге значит, что Traefik
игнорирует контейнеры без явного разрешения.

## Добавить новый сервис в Traefik

В docker-compose.yml для нового сервиса замените `ports:` на `expose:` и добавьте labels:

```yaml
my-new-service:
  expose:
    - '3009'
  labels:
    - 'traefik.enable=true'
    - 'traefik.http.routers.my-new-service.rule=Host(`my-new-service.localhost`)'
    - 'traefik.http.routers.my-new-service.entrypoints=web'
    - 'traefik.http.services.my-new-service.loadbalancer.server.port=3009'
```

Traefik подхватит новый контейнер автоматически при `docker compose up`.

## Production: добавить HTTPS

1. Добавьте в `traefik/traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: devops@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

2. Добавьте в labels сервиса:

```yaml
- 'traefik.http.routers.bot-gateway.entrypoints=websecure'
- 'traefik.http.routers.bot-gateway.tls.certresolver=letsencrypt'
```

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `BOT_DOMAIN` | Нет | Домен bot-gateway. По умолчанию `bot.localhost` |

## Структура файлов

```
traefik/
  traefik.yml               ← статическая конфигурация (entrypoints, providers)
  dynamic/
    middlewares.yml          ← rate limiting, security headers
```
