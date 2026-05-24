// Роль пользователя или сервиса.
export type Role = 'admin' | 'employee' | 'service'

// Разрешения, которыми оперирует RBAC.
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

// Actor — тот, кто пытается выполнить действие.
export type Actor = {
  id: string
  roles: Role[]
  type: 'telegram-user' | 'service' | 'web-user'
}

// Решение policy: разрешено или запрещено с причиной.
export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

// Таблица соответствия ролей и разрешений.
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

/**
 * Проверяет наличие permission у actor.
 */
export function can(actor: Actor, permission: Permission): boolean {
  // Достаточно, чтобы хотя бы одна роль actor-а содержала permission.
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
  // Set убирает дубли permissions между ролями.
  return [...new Set(actor.roles.flatMap((role) => ROLE_PERMISSIONS[role]))]
}
