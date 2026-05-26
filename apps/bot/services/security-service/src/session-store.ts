import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

// access token живёт 15 минут — короткий срок снижает ущерб от компрометации
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

// refresh token живёт 30 дней — баланс между UX и безопасностью
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Данные новой сессии: access token + refresh token.
 */
export type SessionTokens = {
  accessToken: string
  refreshToken: string
}

/**
 * Результат ротации refresh token.
 *
 * ok — сессия обновлена, выданы новые токены.
 * not_found — refresh token не найден: уже использован или никогда не существовал.
 * expired — сессия истекла, нужна повторная аутентификация.
 */
export type RotateSessionResult =
  | { status: 'ok'; tokens: SessionTokens }
  | { status: 'not_found' }
  | { status: 'expired' }

/**
 * Создаёт новую сессию в базе и возвращает пару токенов.
 * 
 * важно:
 * - refresh token — криптографически случайные 32 байта, хранится в БД.
 * - access token не хранится в БД, его создаёт caller после получения refreshToken.
 * - expiresAt не продлевается при ротации — пользователь переаутентифицируется раз в 30 дней.
 */
export async function createSession(input: {
  prisma: PrismaClient
  userId: string
  userRole: 'admin' | 'employee'
}): Promise<Pick<SessionTokens, 'refreshToken'> & { expiresAt: Date; userId: string; userRole: string }> {
  const refreshToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

  await input.prisma.securitySession.create({
    data: {
      expiresAt,
      refreshToken,
      userId: input.userId,
      userRole: input.userRole,
    },
  })

  return { expiresAt, refreshToken, userId: input.userId, userRole: input.userRole }
}

/**
 * Ротирует refresh token: удаляет старый и создаёт новый атомарно.
 *
 * Каждый refresh token одноразовый — после использования он исчезает из БД.
 * Если тот же токен придёт снова — он уже не найден, возвращается not_found.
 *
 * важно:
 * - удаление и создание в одной транзакции — нет ситуации где токен удалён, а новый не создан.
 * - роль берётся из записи в БД, а не из входящего запроса — защита от privilege escalation.
 * - expiresAt наследуется от старой сессии, не продлевается.
 */
export async function rotateSession(input: {
  prisma: PrismaClient
  refreshToken: string
}): Promise<RotateSessionResult & { userId?: string; userRole?: string }> {
  const session = await input.prisma.securitySession.findUnique({
    where: { refreshToken: input.refreshToken },
  })

  // токен не найден — либо уже использован, либо никогда не существовал
  if (!session) {
    return { status: 'not_found' }
  }

  // сессия истекла — удаляем и просим пользователя войти заново
  if (session.expiresAt <= new Date()) {
    await input.prisma.securitySession.delete({ where: { id: session.id } })
    return { status: 'expired' }
  }

  const newRefreshToken = randomBytes(32).toString('base64url')

  // атомарно: удаляем старую сессию и создаём новую в одной транзакции
  await input.prisma.$transaction([
    input.prisma.securitySession.delete({ where: { id: session.id } }),
    input.prisma.securitySession.create({
      data: {
        // expiresAt наследуем от старой сессии — не продлеваем
        expiresAt: session.expiresAt,
        refreshToken: newRefreshToken,
        userId: session.userId,
        userRole: session.userRole,
      },
    }),
  ])

  return {
    status: 'ok',
    tokens: { accessToken: '', refreshToken: newRefreshToken },
    userId: session.userId,
    userRole: session.userRole,
  }
}

/**
 * Удаляет сессию при явном logout.
 *
 * После этого caller должен отозвать access token через revokeToken,
 * иначе токен останется валидным до истечения TTL (15 минут).
 * Использует deleteMany — не бросает ошибку если сессия уже удалена.
 */
export async function deleteSession(input: {
  prisma: PrismaClient
  refreshToken: string
}): Promise<void> {
  await input.prisma.securitySession.deleteMany({
    where: { refreshToken: input.refreshToken },
  })
}

/**
 * Удаляет все сессии пользователя — используется при компрометации аккаунта.
 */
export async function deleteAllUserSessions(input: {
  prisma: PrismaClient
  userId: string
}): Promise<number> {
  const result = await input.prisma.securitySession.deleteMany({
    where: { userId: input.userId },
  })

  // возвращаем количество удалённых сессий для audit log
  return result.count
}
