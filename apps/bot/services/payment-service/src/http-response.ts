import type { ServerResponse } from 'node:http'

const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ и держит форматирование HTTP response в одном месте.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  // Сначала отправляем status и content-type.
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  // Потом сериализуем body.
  res.end(JSON.stringify(data))
}
 