import { createHmac, timingSafeEqual } from 'node:crypto'

type JwtPayload = {
  exp: number
  role: 'admin' | 'employee'
  sub: string
}

type VerifyJwtResult =
  | { status: 'ok'; payload: JwtPayload }
  | { status: 'error'; message: string }

// создаёт jwt для api-сессии
export function createJwt(input: {
  expiresInSeconds: number
  role: 'admin' | 'employee'
  secret: string
  userId: string
}): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    exp: Math.floor(Date.now() / 1000) + input.expiresInSeconds,
    role: input.role,
    sub: input.userId,
  })
  const signature = sign(`${header}.${payload}`, input.secret)

  return `${header}.${payload}.${signature}`
}

// проверяет jwt и срок жизни
export function verifyJwt(token: string, secret: string): VerifyJwtResult {
  const [header, payload, signature] = token.split('.')

  if (!header || !payload || !signature) {
    return { status: 'error', message: 'invalid token format' }
  }

  const expectedSignature = sign(`${header}.${payload}`, secret)
  if (!safeEqual(signature, expectedSignature)) {
    return { status: 'error', message: 'invalid token signature' }
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtPayload
  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return { status: 'error', message: 'token expired' }
  }

  return { status: 'ok', payload: parsed }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
