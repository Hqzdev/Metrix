import type { AuditEntry } from './types.js'

/**
 * Записывает структурированную audit-запись в stdout.
 *
 * Audit log обязателен для мутирующих административных и платёжных действий.
 * Пишется в stdout (не stderr), чтобы log collector мог маршрутизировать
 * audit отдельно от error-логов.
 */
export function audit(entry: AuditEntry): void {
  console.log(JSON.stringify(entry))
}
