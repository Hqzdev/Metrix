import type { IncomingMessage } from 'node:http'
import { MAX_BODY_BYTES } from './constants.js'

/**
 * Читает тело HTTP-запроса с ограничением размера.
 *
 * Превышение MAX_BODY_BYTES разрушает соединение немедленно —
 * продолжать чтение при DoS-атаке бессмысленно и опасно.
 */
export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: string) => {
      // Собираем body постепенно.
      raw += chunk
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        // Если body слишком большой, сразу разрываем соединение.
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

/**
 * Читает и парсит JSON body.
 *
 * Проверяет content-type и лимит размера.
 */
export function readJsonBody<T>(req: IncomingMessage): Promise<{ raw: string; parsed: T }> {
  // Межсервисные POST/PATCH запросы должны быть JSON.
  const ct = req.headers['content-type'] ?? ''
  if (!ct.includes('application/json')) {
    return Promise.reject(new Error('content-type must be application/json'))
  }
  return readBody(req).then((raw) => ({ raw, parsed: JSON.parse(raw) as T }))
}
