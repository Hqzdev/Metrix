import type { ServerResponse } from 'node:http'

const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ и держит форматирование HTTP response в одном месте.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  res.end(JSON.stringify(data))
}
