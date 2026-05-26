import { Client as MinioClient } from 'minio'
import type { Readable } from 'node:stream'
import type { BucketName } from './buckets.js'
import type { PresignedUrlOptions, StorageConfig, UploadResult } from './types.js'

// Время жизни presigned URL по умолчанию — 15 минут.
// Достаточно, чтобы пользователь скачал файл, но не слишком долго для безопасности.
const DEFAULT_PRESIGNED_EXPIRY_SECONDS = 15 * 60

/**
 * Клиент для работы с MinIO (S3-совместимым объектным хранилищем).
 *
 * Важно:
 * - Все bucket-операции идут через один MinioClient — переиспользуйте один экземпляр.
 * - ensureBucket вызывайте при старте сервиса, а не перед каждой операцией.
 * - Presigned URL содержит временные credentials — не логируйте их целиком.
 */
export class StorageClient {
  private readonly minio: MinioClient

  /**
   * Создаёт клиент с готовым MinioClient внутри.
   * Соединение устанавливается лениво при первом запросе.
   */
  constructor(config: StorageConfig) {
    this.minio = new MinioClient({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    })
  }

  /**
   * Создаёт бакет, если он ещё не существует.
   *
   * Вызывайте один раз при старте сервиса.
   * MinIO не кидает ошибку при попытке создать уже существующий бакет.
   */
  async ensureBucket(bucket: BucketName): Promise<void> {
    // Проверяем существование, чтобы не делать лишний PUT при каждом запуске.
    const exists = await this.minio.bucketExists(bucket)
    if (!exists) {
      // us-east-1 — дефолтный регион MinIO, достаточен для self-hosted.
      await this.minio.makeBucket(bucket, 'us-east-1')
    }
  }

  /**
   * Загружает Buffer как объект в хранилище.
   *
   * Используйте для небольших файлов (< 100 MB).
   * Для больших файлов используйте uploadStream.
   */
  async uploadBuffer(
    bucket: BucketName,
    objectKey: string,
    data: Buffer,
    // contentType нужен, чтобы браузер корректно открывал файлы по presigned URL.
    contentType: string,
  ): Promise<UploadResult> {
    const result = await this.minio.putObject(bucket, objectKey, data, data.length, {
      'Content-Type': contentType,
    })

    return {
      etag: result.etag,
      bucket,
      objectKey,
    }
  }

  /**
   * Загружает Node.js Readable stream как объект.
   *
   * Подходит для больших файлов: MinIO сам управляет multipart upload.
   * size передавайте если известен — MinIO использует его для оптимизации.
   */
  async uploadStream(
    bucket: BucketName,
    objectKey: string,
    stream: Readable,
    contentType: string,
    size?: number,
  ): Promise<UploadResult> {
    const result = await this.minio.putObject(bucket, objectKey, stream, size, {
      'Content-Type': contentType,
    })

    return {
      etag: result.etag,
      bucket,
      objectKey,
    }
  }

  /**
   * Скачивает объект целиком в Buffer.
   *
   * Для больших файлов предпочтительнее getObjectStream — чтобы не держать
   * всё содержимое в памяти.
   */
  async downloadToBuffer(bucket: BucketName, objectKey: string): Promise<Buffer> {
    const stream = await this.minio.getObject(bucket, objectKey)

    // Собираем chunks в массив и склеиваем в один Buffer.
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      stream.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Возвращает объект как читаемый stream.
   *
   * Используйте для передачи файла напрямую в HTTP-ответ или Telegram API
   * без загрузки всего содержимого в память.
   */
  async getObjectStream(bucket: BucketName, objectKey: string): Promise<Readable> {
    return this.minio.getObject(bucket, objectKey)
  }

  /**
   * Генерирует временную ссылку для скачивания объекта.
   *
   * Presigned URL содержит подписанные credentials в query string —
   * пользователь может скачать файл без аутентификации через MinIO API.
   * По умолчанию ссылка действует 15 минут.
   */
  async getPresignedDownloadUrl(
    bucket: BucketName,
    objectKey: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    const expirySeconds = options.expirySeconds ?? DEFAULT_PRESIGNED_EXPIRY_SECONDS

    return this.minio.presignedGetObject(bucket, objectKey, expirySeconds)
  }

  /**
   * Удаляет объект из хранилища.
   *
   * MinIO не кидает ошибку если объект не существует — операция идемпотентна.
   */
  async delete(bucket: BucketName, objectKey: string): Promise<void> {
    await this.minio.removeObject(bucket, objectKey)
  }

  /**
   * Проверяет существование объекта.
   *
   * Используйте перед скачиванием, чтобы вернуть понятную ошибку
   * вместо необработанного исключения MinIO.
   */
  async exists(bucket: BucketName, objectKey: string): Promise<boolean> {
    try {
      await this.minio.statObject(bucket, objectKey)
      return true
    } catch (error) {
      // MinIO кидает ошибку с кодом 'NotFound' если объект не существует.
      if (isNotFoundError(error)) return false

      // Остальные ошибки (сеть, права) пробрасываем — они неожиданные.
      throw error
    }
  }
}

/**
 * Определяет, является ли ошибка ответом "объект не найден" от MinIO.
 */
function isNotFoundError(error: unknown): boolean {
  // MinIO SDK кидает объект с полем code при S3-ошибках.
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error.code === 'NotFound' || error.code === 'NoSuchKey')
  )
}
