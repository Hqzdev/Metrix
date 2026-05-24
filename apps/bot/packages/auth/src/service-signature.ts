import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { MAX_DRIFT_MS } from './constants.js'
import { createTraceparent, readTraceparent } from './trace.js'
import type { TrustedCaller, VerifyResult } from './types.js'

/**
 * Создаёт заголовки для подписанного межсервисного запроса.
 *
 * Подпись покрывает: METHOD, path, timestamp, request-id, sha256(body).
 */
export function buildAuthHeaders(
  method: string,
  path: string,
  body: string,
  serviceName: string,
  signingSecret: string,
): Record<string, string> {
  // Timestamp нужен, чтобы старую подпись нельзя было использовать бесконечно.
  const timestamp = Math.floor(Date.now() / 1000).toString()
  // requestId нужен для replay-защиты и логов.
  const requestId = randomUUID()
  // traceparent связывает запросы между сервисами.
  const traceparent = createTraceparent()
  // Подписываем не сам body, а его sha256 hash.
  const bodyHash = createHash('sha256').update(body).digest('hex')
  // Важно сохранять тот же порядок строк при проверке.
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = createHmac('sha256', signingSecret).update(message).digest('hex')
  return {
    'content-type': 'application/json',
    'x-service-name': serviceName,
    'x-timestamp': timestamp,
    'x-request-id': requestId,
    'x-signature': signature,
    traceparent,
  }
}

/**
 * Проверяет, что входящий запрос подписан доверенным сервисом.
 *
 * Вызывать нужно ПОСЛЕ чтения body, потому что rawBody нужен для hash.
 */
export function verifyServiceRequest(
  req: IncomingMessage,
  rawBody: string,
  trusted: TrustedCaller[],
): VerifyResult {
  // Достаём обязательные auth headers.
  const name = req.headers['x-service-name'] as string | undefined
  const timestamp = req.headers['x-timestamp'] as string | undefined
  const requestId = req.headers['x-request-id'] as string | undefined
  const signature = req.headers['x-signature'] as string | undefined

  // Если чего-то не хватает, запрос не считается доверенным.
  if (!name || !timestamp || !requestId || !signature) {
    return { ok: false, error: 'missing auth headers' }
  }

  // Защита от старых запросов и сильного clock skew.
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > MAX_DRIFT_MS) {
    return { ok: false, error: 'request expired or clock skew too large' }
  }

  // Проверяем, что caller есть в списке доверенных.
  const caller = trusted.find((c) => c.name === name)
  if (!caller) {
    return { ok: false, error: 'unauthorized' }
  }

  // В подпись входит method и path с query string.
  const method = (req.method ?? 'GET').toUpperCase()
  const url = new URL(req.url ?? '/', 'http://localhost')
  const urlPath = `${url.pathname}${url.search}`
  const bodyHash = createHash('sha256').update(rawBody).digest('hex')
  const message = [method, urlPath, timestamp, requestId, bodyHash].join('\n')
  // Массив secrets нужен для плавной ротации ключей.
  const secrets = Array.isArray(caller.secret) ? caller.secret : [caller.secret]
  const matched = secrets.some((secret) => signatureMatches(message, signature, secret))

  if (!matched) {
    return { ok: false, error: 'invalid signature' }
  }

  // Возвращаем callerName и requestId, чтобы сервис мог логировать/audit.
  return { ok: true, callerName: name, requestId, traceparent: readTraceparent(req) }
}

function signatureMatches(message: string, signature: string, secret: string): boolean {
  // Считаем ожидаемую HMAC-подпись.
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  const givenBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')

  // timingSafeEqual защищает от timing attacks.
  return givenBuf.length === expectedBuf.length && timingSafeEqual(givenBuf, expectedBuf)
}
