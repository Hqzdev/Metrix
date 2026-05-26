// Конфигурация подключения к MinIO/S3-совместимому хранилищу.
export type StorageConfig = {
  // Хост MinIO без протокола — например, "minio" (docker) или "s3.example.com".
  endpoint: string
  // Порт MinIO API. Обычно 9000 для http и 443 для https.
  port: number
  // Использовать TLS. В docker-compose локально — false, в production — true.
  useSSL: boolean
  // Аналог AWS Access Key Id.
  accessKey: string
  // Аналог AWS Secret Access Key.
  secretKey: string
}

// Метаданные объекта, возвращаемые при загрузке.
export type UploadResult = {
  // Итоговый путь объекта в бакете (etag как идентификатор версии).
  etag: string
  // Имя бакета, куда загружен объект.
  bucket: string
  // Ключ объекта внутри бакета.
  objectKey: string
}

// Опции для генерации presigned URL.
export type PresignedUrlOptions = {
  // Время жизни ссылки в секундах. По умолчанию 15 минут.
  expirySeconds?: number
}
