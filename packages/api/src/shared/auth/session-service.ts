import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { createJwt } from './jwt.js'

type SessionTokens = {
  accessToken: string
  refreshToken: string
}

// создаёт refresh-сессию и короткий access jwt
export async function createSession(input: {
  jwtSecret: string
  prisma: PrismaClient
  role: 'admin' | 'employee'
  userId: string
}): Promise<SessionTokens> {
  const refreshToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await input.prisma.session.create({
    data: {
      expiresAt,
      refreshToken,
      userId: input.userId,
    },
  })

  return {
    accessToken: createJwt({
      expiresInSeconds: 15 * 60,
      role: input.role,
      secret: input.jwtSecret,
      userId: input.userId,
    }),
    refreshToken,
  }
}
