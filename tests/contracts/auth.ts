import { createHash, createHmac, randomUUID } from 'node:crypto'

const DEFAULT_SERVICE_NAME = 'bot-gateway'
const DEFAULT_SIGNING_SECRET = 'dev-secret'

const serviceName = process.env.CONTRACT_TEST_SERVICE_NAME ?? DEFAULT_SERVICE_NAME
const signingSecret = process.env.CONTRACT_TEST_SIGNING_SECRET ?? process.env.SERVICE_SIGNING_SECRET ?? DEFAULT_SIGNING_SECRET
const userIdSigningSecret = process.env.CONTRACT_TEST_USER_ID_SIGNING_SECRET ?? signingSecret

export function serviceAuthHeaders(method: string, path: string, body = ''): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const requestId = randomUUID()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = createHmac('sha256', signingSecret).update(message).digest('hex')

  return {
    'content-type': 'application/json',
    'x-service-name': serviceName,
    'x-timestamp': timestamp,
    'x-request-id': requestId,
    'x-signature': signature,
  }
}

export function userIdHeaders(userId: number): Record<string, string> {
  return {
    'x-user-id': String(userId),
    'x-user-sig': createHmac('sha256', userIdSigningSecret).update(String(userId)).digest('hex'),
  }
}
