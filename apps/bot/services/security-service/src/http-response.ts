import type { ServerResponse } from 'node:http'

// единственный content-type для всех ответов сервиса
const JSON_CONTENT_TYPE = 'application/json'

/**
 * Отправляет JSON-ответ клиенту.
 *
 * Держит форматирование HTTP response в одном месте — статус и тело меняются
 * только через эту функцию, остальной код не трогает res напрямую.
 */
export function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE })
  res.end(JSON.stringify(data))
}
