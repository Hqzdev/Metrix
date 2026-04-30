import { verifyJwt } from './jwt.js'

type AuthUser = {
  id: string
  role: 'admin' | 'employee'
}

type AuthResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'error'; message: string }

// достаёт пользователя из authorization header
export function authenticateRequest(input: { authorization?: string; jwtSecret: string }): AuthResult {
  const token = input.authorization?.replace(/^Bearer\s+/i, '')

  if (!token) {
    return { status: 'error', message: 'authorization token is required' }
  }

  const result = verifyJwt(token, input.jwtSecret)
  if (result.status === 'error') {
    return result
  }

  return {
    status: 'ok',
    user: {
      id: result.payload.sub,
      role: result.payload.role,
    },
  }
}

// проверяет что пользователь админ
export function requireAdmin(user: AuthUser): AuthResult {
  if (user.role !== 'admin') {
    return { status: 'error', message: 'admin role is required' }
  }

  return { status: 'ok', user }
}
