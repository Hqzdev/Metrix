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
