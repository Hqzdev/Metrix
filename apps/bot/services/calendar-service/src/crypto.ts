import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

// AES-256-GCM одновременно шифрует и проверяет целостность данных.
const ALGORITHM = 'aes-256-gcm'

// Контекстная метка версии — смена строки инвалидирует все существующие токены.
const HKDF_INFO = 'metrix-calendar-tokens-v1'

/**
 * Шифрует строку AES-256-GCM с уникальным IV на каждый вызов.
 *
 * Формат возвращаемой строки: base64(iv).base64(authTag).base64(ciphertext)
 */
export function encrypt(value: string, secret: string): string {
  // GCM обычно использует 12-байтный IV; он должен быть новым для каждого шифрования.
  const iv = randomBytes(12)
  // deriveKey превращает общий secret в ключ нужной длины.
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv)
  // Шифруем строку в bytes.
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  // authTag нужен для проверки, что ciphertext не меняли.
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`
}

/**
 * Расшифровывает строку, зашифрованную через encrypt().
 *
 * GCM аутентификация проверяется автоматически — любая модификация
 * зашифрованных данных приведёт к ошибке.
 */
export function decrypt(value: string, secret: string): string {
  // Формат должен совпадать с encrypt: iv.tag.ciphertext.
  const [iv, tag, enc] = value.split('.').map((p) => Buffer.from(p, 'base64'))
  // Создаём decipher с тем же алгоритмом и ключом.
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv)
  // Перед decrypt обязательно задаём auth tag.
  decipher.setAuthTag(tag)
  // Если данные подменили, final() бросит ошибку.
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

// HKDF растягивает секрет до 256-битного ключа с контекстной привязкой.
function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, '', HKDF_INFO, 32))
}
