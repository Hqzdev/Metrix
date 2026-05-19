import { PrismaClient } from '@prisma/client'

/**
 * Единый экземпляр PrismaClient для backend-пакета.
 *
 * Синглтон намеренен — Prisma использует connection pool, создание
 * нескольких экземпляров приведёт к исчерпанию соединений с БД.
 */
export const prisma = new PrismaClient()
