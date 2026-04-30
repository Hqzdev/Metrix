Deployment

О чем этот файл

Этот документ описывает инфраструктуру проекта: окружения, деплой, конфигурацию сервисов, переменные окружения и наблюдаемость.

Что здесь должно быть описано

- какие окружения есть: local, preview, production;
- где запускается web;
- где запускается backend;
- где запускаются workers;
- где находится PostgreSQL;
- где находится Redis;
- как настроены secrets и env;
- как устроены логирование, мониторинг и health checks.

Какие файлы появятся в проекте

```txt
.env.example
.env.local
docker-compose.yml
vercel.json
src/shared/config/env.ts
src/shared/config/runtime.ts
scripts/bootstrap-local.sh
scripts/migrate.sh
scripts/seed.sh
```

Если будет контейнеризация, дополнительно:

```txt
Dockerfile
Dockerfile.worker
.dockerignore
```

Какие сервисы ожидаются

- web runtime
- api runtime
- background workers
- PostgreSQL
- Redis
- monitoring / logging provider

Зачем нужен этот файл

Чтобы деплой и локальная среда были воспроизводимыми, а запуск проекта не зависел от устных договорённостей внутри команды.
