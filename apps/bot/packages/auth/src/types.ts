// Доверенный caller: имя сервиса и один или несколько секретов.
export type TrustedCaller = { name: string; secret: string | string[] }

// Результат проверки service-to-service подписи.
export type VerifyResult =
  | { ok: true; callerName: string; requestId: string; traceparent: string }
  | { ok: false; error: string }

// Данные, которые кладём в OAuth state.
export type OAuthStateData = { telegramUserId: number; scope: string; resourceId?: string }

// Одна audit-запись для stdout audit stream.
export type AuditEntry = {
  ts: string
  service: string
  action: string
  requestId?: string
  userId?: number
  [key: string]: unknown
}
