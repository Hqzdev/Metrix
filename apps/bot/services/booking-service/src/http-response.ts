import type { ServerResponse } from 'node:http'

// Content-Type для всех JSON-ответов сервиса.
const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ единым способом для всех HTTP handlers.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  // Сначала отправляем HTTP-код и заголовки.
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  // Затем сериализуем тело ответа в JSON.
  res.end(JSON.stringify(data))
}
