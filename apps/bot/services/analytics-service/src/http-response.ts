import type { ServerResponse } from 'node:http'

/**
 * Отправляет JSON-ответ единым способом для всех route handlers.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}
