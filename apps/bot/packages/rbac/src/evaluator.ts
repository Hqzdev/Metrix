import { ROLE_PERMISSIONS } from './permissions.js'
import type { Actor, Permission, PolicyDecision } from './types.js'

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
