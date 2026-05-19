import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)

const ITERATIONS = 120_000
const MIN_ITERATIONS = 100_000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

// хеширует пароль для хранения (async — не блокирует event loop)
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url')
  const hash = (await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)).toString('base64url')
  return `${ITERATIONS}.${salt}.${hash}`
}

// сравнивает пароль с сохранённым хешем
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [rawIterations, salt, hash] = storedHash.split('.')

  if (!rawIterations || !salt || !hash) {
    throw new Error('malformed stored hash')
  }

  const iter = Number(rawIterations)
  if (!Number.isInteger(iter) || iter < MIN_ITERATIONS) {
    throw new Error(`invalid stored hash: iterations ${iter} below minimum ${MIN_ITERATIONS}`)
  }

  const actualHash = (await pbkdf2Async(password, salt, iter, KEY_LENGTH, DIGEST)).toString('base64url')
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
