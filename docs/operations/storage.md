# Object storage: @metrix/storage + MinIO

## Что это и зачем

MinIO — S3-совместимое self-hosted объектное хранилище. `@metrix/storage` — shared пакет,
который оборачивает MinIO SDK для единообразной работы с файлами во всех сервисах.

До MinIO: worker-service писал отчёты на диск (`/app/reports`), notification-service читал их
с того же диска. Это работало пока оба сервиса жили на одном хосте. При масштабировании — нет.

С MinIO: worker-service загружает файл в бакет, notification-service скачивает. Файлы доступны
любому сервису в любом контейнере.

## Как запустить локально

```bash
docker compose up minio
```

MinIO Console: `http://minio.localhost` (через Traefik) — логин/пароль из `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.

MinIO S3 API: `http://minio-api.localhost` (через Traefik) или `http://minio:9000` внутри docker-сети.

## Архитектура пакета

```
packages/storage/
  src/
    index.ts      ← публичное API (реэкспорты)
    buckets.ts    ← константы имён бакетов BUCKETS
    client.ts     ← StorageClient класс
    config.ts     ← readStorageConfig() читает env
    types.ts      ← типы: StorageConfig, UploadResult, PresignedUrlOptions
  .env.example
  USAGE.md        ← пример подключения в сервис
  package.json
  tsconfig.json
```

## Бакеты

| Константа | Имя бакета | Назначение |
|---|---|---|
| `BUCKETS.REPORTS` | `metrix-reports` | Аналитические отчёты (PDF, TXT) |
| `BUCKETS.RESOURCES` | `metrix-resources` | Планы этажей, фото (зарезервировано) |

Имена бакетов нельзя менять без миграции данных — они захардкожены в `buckets.ts`.

## Методы StorageClient

| Метод | Назначение |
|---|---|
| `ensureBucket(bucket)` | Создаёт бакет если не существует. Вызывать при старте. |
| `uploadBuffer(bucket, key, buffer, contentType)` | Загружает Buffer < 100 MB |
| `uploadStream(bucket, key, stream, contentType, size?)` | Загружает большой файл потоком |
| `downloadToBuffer(bucket, key)` | Скачивает файл целиком в память |
| `getObjectStream(bucket, key)` | Возвращает Readable stream (для больших файлов) |
| `getPresignedDownloadUrl(bucket, key, options?)` | Временная ссылка для скачивания (15 мин) |
| `delete(bucket, key)` | Удаляет объект. Идемпотентно — не кидает ошибку если нет. |
| `exists(bucket, key)` | Проверяет существование объекта |

## Подключение в новый сервис

Шаг 1 — добавить зависимость:
```json
{ "dependencies": { "@metrix/storage": "*" } }
```

Шаг 2 — добавить env в docker-compose сервиса:
```yaml
environment:
  MINIO_ENDPOINT: minio
  MINIO_PORT: '9000'
  MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
  MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
  MINIO_USE_SSL: 'false'
```

Шаг 3 — инициализировать и использовать:
```ts
import { StorageClient, readStorageConfig, BUCKETS } from '@metrix/storage'

const storage = new StorageClient(readStorageConfig(process.env))
await storage.ensureBucket(BUCKETS.REPORTS)
```

Полный пример — в `packages/storage/USAGE.md`.

## Как интегрировать worker-service с MinIO

Текущий worker-service пишет отчёты в `/app/reports` и публикует `filePath` в Redis stream.
После интеграции `@metrix/storage`:

1. Сгенерировать отчёт в буфер (или tmpfile).
2. Загрузить в `BUCKETS.REPORTS` с ключом вида `reports/<reportId>/<uuid>.txt`.
3. Вместо `filePath` опубликовать `objectKey` в Redis stream.
4. notification-service скачивает объект через `downloadToBuffer()` и отправляет через Telegram.

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `MINIO_ACCESS_KEY` | Да | Аналог AWS Access Key Id |
| `MINIO_SECRET_KEY` | Да | Аналог AWS Secret Access Key (мин. 16 символов) |
| `MINIO_ENDPOINT` | Нет | Хост MinIO (по умолчанию `minio`) |
| `MINIO_PORT` | Нет | Порт S3 API (по умолчанию `9000`) |
| `MINIO_USE_SSL` | Нет | TLS (по умолчанию `false`) |

## Структура файлов

```
apps/bot/packages/storage/
  src/
    buckets.ts    ← константы BUCKETS и тип BucketName
    client.ts     ← StorageClient: upload, download, presign, delete, exists
    config.ts     ← readStorageConfig() из env
    index.ts      ← публичный API пакета
    types.ts      ← StorageConfig, UploadResult, PresignedUrlOptions
  .env.example
  USAGE.md
  package.json
  tsconfig.json
```
