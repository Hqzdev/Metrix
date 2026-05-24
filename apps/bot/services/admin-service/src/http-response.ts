import type { ServerResponse } from 'node:http'

// Единый content-type для всех JSON-ответов сервиса.
const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ и держит форматирование HTTP response в одном месте.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  // Сначала отправляем HTTP-статус и заголовки.
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  // Потом сериализуем тело ответа в JSON-строку.
  res.end(JSON.stringify(data))
}
