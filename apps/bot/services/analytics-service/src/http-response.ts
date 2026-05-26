import type { ServerResponse } from 'node:http'

// Единый content-type для JSON-ответов.
const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ единым способом для всех route handlers.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  // Сначала пишем HTTP status и headers.
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  // Потом сериализуем тело ответа.
  res.end(JSON.stringify(data))
}
 