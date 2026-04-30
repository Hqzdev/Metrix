import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'

const iterations = 120_000
const keyLength = 64
const digest = 'sha512'

// хеширует пароль для хранения
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('base64url')

  return `${iterations}.${salt}.${hash}`
}

// сравнивает пароль с сохранённым хешем
export function verifyPassword(password: string, storedHash: string): boolean {
  const [storedIterations, salt, hash] = storedHash.split('.')
  const actualHash = pbkdf2Sync(password, salt, Number(storedIterations), keyLength, digest).toString('base64url')

  return safeEqual(hash, actualHash)
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
