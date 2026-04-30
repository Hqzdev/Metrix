import { PrismaClient } from '@prisma/client'

// единый prisma client для backend-пакета
export const prisma = new PrismaClient()
