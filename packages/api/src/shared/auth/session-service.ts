import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { createJwt, type JwtSecrets } from './jwt.js'

// короткий access token снижает ущерб от компрометации — refresh обновит его
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

// refresh живёт 30 дней — баланс между UX и безопасностью
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

type SessionTokens = {
  accessToken: string
  refreshToken: string
}

/**
 * Результат ротации refresh token.
 *
 * ok — старый токен уничтожен, выданы новые токены.
 * not_found — токен не существует или уже был использован.
 * expired — сессия истекла, нужна повторная аутентификация.
 */
export type RotateSessionResult =
  | { status: 'ok'; tokens: SessionTokens }
  | { status: 'not_found' }
  | { status: 'expired' }

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
  jwtSecrets: JwtSecrets
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
      secrets: input.jwtSecrets,
      userId: input.userId,
    }),
    refreshToken,
  }
}

/**
 * Ротирует сессию: уничтожает старый refresh token и выдаёт новую пару токенов.
 *
 * Каждый refresh token — одноразовый. После использования он удаляется из БД,
 * а вместо него создаётся новый. Если тот же токен придёт повторно —
 * его уже не будет в базе, и запрос получит статус not_found.
 *
 * важно:
 * - старая и новая сессии обновляются в одной транзакции — нет ситуации,
 *   когда старый токен удалён, а новый ещё не создан.
 * - роль берётся из записи пользователя в БД, а не из входящего запроса —
 *   это защищает от privilege escalation через подделку параметров.
 * - expiresAt новой сессии наследуется от старой, не продлевается —
 *   пользователь переаутентифицируется в плановое время.
 */
export async function rotateSession(input: {
  jwtSecrets: JwtSecrets
  prisma: PrismaClient
  refreshToken: string
}): Promise<RotateSessionResult> {
  // ищем сессию с таким refresh token
  const session = await input.prisma.session.findUnique({
    include: { user: true },
    where: { refreshToken: input.refreshToken },
  })

  // токен не найден: либо никогда не существовал, либо уже был использован
  if (!session) {
    return { status: 'not_found' }
  }

  // сессия истекла — удаляем её и сообщаем пользователю о необходимости логина
  if (session.expiresAt <= new Date()) {
    await input.prisma.session.delete({ where: { id: session.id } })
    return { status: 'expired' }
  }

  const newRefreshToken = randomBytes(32).toString('base64url')
  const userRole = session.user.role as 'admin' | 'employee'

  // удаляем старую сессию и создаём новую атомарно —
  // это гарантирует, что токен нельзя использовать дважды даже при параллельных запросах
  await input.prisma.$transaction([
    input.prisma.session.delete({ where: { id: session.id } }),
    input.prisma.session.create({
      data: {
        // expiresAt новой сессии = expiresAt старой, не продлеваем
        expiresAt: session.expiresAt,
        refreshToken: newRefreshToken,
        userId: session.userId,
      },
    }),
  ])

  return {
    status: 'ok',
    tokens: {
      accessToken: createJwt({
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        role: userRole,
        secrets: input.jwtSecrets,
        userId: session.userId,
      }),
      refreshToken: newRefreshToken,
    },
  }
}

/**
 * Удаляет сессию из БД — используется при явном logout.
 *
 * После logout access token нужно отозвать отдельно через revokeAccessToken,
 * потому что JWT не имеет состояния и будет валиден до истечения TTL.
 */
export async function deleteSession(input: {
  prisma: PrismaClient
  refreshToken: string
}): Promise<void> {
  // deleteMany вместо delete — не бросает ошибку если токен уже удалён
  await input.prisma.session.deleteMany({
    where: { refreshToken: input.refreshToken },
  })
}
