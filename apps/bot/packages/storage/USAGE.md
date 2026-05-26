# Подключение @metrix/storage к сервису

## 1. Добавить зависимость

```json
{
  "dependencies": {
    "@metrix/storage": "*"
  }
}
```

## 2. Инициализировать клиент в index.ts

```ts
import { StorageClient, readStorageConfig, BUCKETS } from '@metrix/storage'

const storageConfig = readStorageConfig(process.env)
const storage = new StorageClient(storageConfig)

// Создаём бакет при старте — если уже существует, ничего не произойдёт.
await storage.ensureBucket(BUCKETS.REPORTS)
```

## 3. Загрузить файл (Buffer)

```ts
import { BUCKETS } from '@metrix/storage'
import { randomUUID } from 'node:crypto'

const objectKey = `reports/${reportId}/${randomUUID()}.txt`
const result = await storage.uploadBuffer(
  BUCKETS.REPORTS,
  objectKey,
  Buffer.from(reportContent, 'utf-8'),
  'text/plain',
)

// result.objectKey — ключ для последующего скачивания.
```

## 4. Получить presigned URL для скачивания

```ts
// Ссылка действует 15 минут по умолчанию.
const url = await storage.getPresignedDownloadUrl(BUCKETS.REPORTS, objectKey)

// Пользователь получает прямую ссылку — MinIO отдаёт файл без аутентификации.
```

## 5. Скачать объект в память

```ts
const buffer = await storage.downloadToBuffer(BUCKETS.REPORTS, objectKey)
```

## 6. Проверить существование перед скачиванием

```ts
const found = await storage.exists(BUCKETS.REPORTS, objectKey)
if (!found) {
  sendJson(res, { error: 'report not found' }, 404)
  return
}
```

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `MINIO_ACCESS_KEY` | Да | Credentials для S3 API |
| `MINIO_SECRET_KEY` | Да | Secret для S3 API |
| `MINIO_ENDPOINT` | Нет | Хост MinIO (по умолчанию `minio`) |
| `MINIO_PORT` | Нет | Порт S3 API (по умолчанию `9000`) |
| `MINIO_USE_SSL` | Нет | TLS (по умолчанию `false`) |
