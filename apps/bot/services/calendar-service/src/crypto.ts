import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

// контекстная метка версии — смена строки инвалидирует все существующие токены
const HKDF_INFO = 'metrix-calendar-tokens-v1'

/**
 * Шифрует строку AES-256-GCM с уникальным IV на каждый вызов.
 *
 * Формат возвращаемой строки: base64(iv).base64(authTag).base64(ciphertext)
 */
export function encrypt(value: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv)
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`
}

/**
 * Расшифровывает строку, зашифрованную через encrypt().
 *
 * GCM аутентификация проверяется автоматически — любая модификация
 * зашифрованных данных приведёт к ошибке.
 */
export function decrypt(value: string, secret: string): string {
  const [iv, tag, enc] = value.split('.').map((p) => Buffer.from(p, 'base64'))
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

// HKDF растягивает секрет до 256-битного ключа с контекстной привязкой
function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, '', HKDF_INFO, 32))
}
