import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { createJwt } from './jwt.js'

// короткий access token снижает ущерб от компрометации — refresh обновит его
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

// refresh живёт 30 дней — баланс между UX и безопасностью
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

type SessionTokens = {
  accessToken: string
  refreshToken: string
}

/**
 * Создаёт сессию: записывает refresh token в БД и возвращает пару токенов.
 *
 * важно:
 * - refresh token — криптографически случайные 32 байта, хранится в БД.
 * - access token — короткоживущий JWT, не требует обращения к БД при проверке.
 * - expiresAt refresh'а не продлевается при использовании — пользователь
 *   вынужден переаутентифицироваться каждые 30 дней.
 */
export async function createSession(input: {
  jwtSecret: string
  prisma: PrismaClient
  role: 'admin' | 'employee'
  userId: string
}): Promise<SessionTokens> {
  const refreshToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

  await input.prisma.session.create({
    data: {
      expiresAt,
      refreshToken,
      userId: input.userId,
    },
  })

  return {
    accessToken: createJwt({
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      role: input.role,
      secret: input.jwtSecret,
      userId: input.userId,
    }),
    refreshToken,
  }
}
