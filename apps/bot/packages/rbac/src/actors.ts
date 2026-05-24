import type { Actor } from './types.js'

/**
 * Создаёт actor для Telegram user.
 *
 * ADMIN_TELEGRAM_IDS остаётся источником назначения роли admin,
 * но дальнейшая проверка идёт через permissions, а не через isAdmin boolean.
 */
export function createTelegramActor(userId: number, adminTelegramIds: number[]): Actor {
  return {
    id: String(userId),
    // Админ также получает роль employee, чтобы иметь обычные пользовательские права.
    roles: adminTelegramIds.includes(userId) ? ['admin', 'employee'] : ['employee'],
    type: 'telegram-user',
  }
}

/**
 * Создаёт actor для доверенного internal service.
 */
export function createServiceActor(serviceName: string): Actor {
  // Internal services получают роль service.
  return {
    id: serviceName,
    roles: ['service'],
    type: 'service',
  }
}
