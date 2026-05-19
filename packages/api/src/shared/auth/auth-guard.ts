import { verifyJwt } from './jwt.js'

export type AuthUser = {
  id: string
  role: 'admin' | 'employee'
}

export type AuthResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'error'; message: string }

/**
 * Извлекает и верифицирует пользователя из Authorization: Bearer <token>.
 *
 * Возвращает discriminated union вместо исключений — caller явно обязан
 * обработать оба случая, что исключает случайный пропуск auth-проверки.
 */
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

/**
 * Проверяет, что аутентифицированный пользователь имеет роль admin.
 *
 * Вызывается после authenticateRequest — разделение аутентификации
 * и авторизации позволяет применять разные политики доступа к разным эндпоинтам.
 */
export function requireAdmin(user: AuthUser): AuthResult {
  if (user.role !== 'admin') {
    return { status: 'error', message: 'admin role is required' }
  }

  return { status: 'ok', user }
}
