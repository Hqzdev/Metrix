import type { Permission, Role } from './types.js'

// Таблица соответствия ролей и разрешений.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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
