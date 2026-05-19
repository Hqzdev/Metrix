export type Role = 'admin' | 'employee' | 'service'

export type Permission =
  | 'admin:read'
  | 'admin:write'
  | 'analytics:read'
  | 'booking:create'
  | 'booking:read:own'
  | 'booking:cancel:own'
  | 'calendar:manage:own'
  | 'payment:create'
  | 'report:create'
  | 'report:read'

export type Actor = {
  id: string
  roles: Role[]
  type: 'telegram-user' | 'service' | 'web-user'
}

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'admin:read',
    'admin:write',
    'analytics:read',
    'booking:create',
    'booking:read:own',
    'booking:cancel:own',
    'calendar:manage:own',
    'payment:create',
    'report:create',
    'report:read',
  ],
  employee: [
    'booking:create',
    'booking:read:own',
    'booking:cancel:own',
    'calendar:manage:own',
    'payment:create',
  ],
  service: [
    'admin:read',
    'admin:write',
    'analytics:read',
    'booking:create',
    'booking:read:own',
    'booking:cancel:own',
    'calendar:manage:own',
    'payment:create',
    'report:create',
    'report:read',
  ],
}

/**
 * Создаёт actor для Telegram user.
 *
 * ADMIN_TELEGRAM_IDS остаётся источником назначения роли admin,
 * но дальнейшая проверка идёт через permissions, а не через isAdmin boolean.
 */
export function createTelegramActor(userId: number, adminTelegramIds: number[]): Actor {
  return {
    id: String(userId),
    roles: adminTelegramIds.includes(userId) ? ['admin', 'employee'] : ['employee'],
    type: 'telegram-user',
  }
}

/**
 * Создаёт actor для доверенного internal service.
 */
export function createServiceActor(serviceName: string): Actor {
  return {
    id: serviceName,
    roles: ['service'],
    type: 'service',
  }
}

/**
 * Проверяет наличие permission у actor.
 */
export function can(actor: Actor, permission: Permission): boolean {
  return actor.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission))
}

/**
 * Возвращает policy decision с причиной отказа для audit/log.
 */
export function evaluatePolicy(actor: Actor, permission: Permission): PolicyDecision {
  if (can(actor, permission)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `permission ${permission} is required`,
  }
}

/**
 * Возвращает уникальный список permissions actor.
 */
export function listPermissions(actor: Actor): Permission[] {
  return [...new Set(actor.roles.flatMap((role) => ROLE_PERMISSIONS[role]))]
}
