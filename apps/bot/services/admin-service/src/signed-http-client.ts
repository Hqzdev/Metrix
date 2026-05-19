import { buildAuthHeaders } from '@metrix/auth'

const REQUEST_TIMEOUT_MS = 5_000
const SERVICE_NAME = 'admin-service'

export type SignedHttpClient = {
  /**
   * Получает данные из downstream-сервиса или хранилища.
   */
  getJson(url: string): Promise<unknown>
  /**
   * Выполняет шаг patchJson внутри сервисного сценария.
   */
  patchJson(url: string, body: unknown): Promise<unknown>
  /**
   * Выполняет шаг postJson внутри сервисного сценария.
   */
  postJson(url: string, body: unknown): Promise<{ body: unknown; statusCode: number }>
}

/**
 * Создаёт HTTP-клиент, который подписывает каждый downstream-запрос.
 *
 * Admin-service меняет привилегированные данные через booking-service и
 * analytics-service, поэтому исходящие запросы обязаны иметь service-to-service auth.
 */
export function createSignedHttpClient(signingSecret: string): SignedHttpClient {
  return {
    /**
     * Получает данные из downstream-сервиса или хранилища.
     */
    getJson(url) {
      return requestJson({ method: 'GET', signingSecret, url })
    },

    /**
     * Выполняет шаг patchJson внутри сервисного сценария.
     */
    patchJson(url, body) {
      return requestJson({ body, method: 'PATCH', signingSecret, url })
    },

    /**
     * Выполняет шаг postJson внутри сервисного сценария.
     */
    async postJson(url, body) {
      const responseBody = await requestJson({ body, method: 'POST', signingSecret, url })
      return { body: responseBody, statusCode: 201 }
    },
  }
}

type RequestJsonInput = {
  body?: unknown
  method: 'GET' | 'PATCH' | 'POST'
  signingSecret: string
  url: string
}

/**
 * Выполняет HTTP-запрос, парсит JSON и нормализует ошибки downstream-сервиса.
 */
async function requestJson(input: RequestJsonInput): Promise<unknown> {
  const body = input.body === undefined ? '' : JSON.stringify(input.body)
  const parsedUrl = new URL(input.url)
  const headers = buildAuthHeaders(input.method, parsedUrl.pathname, body, SERVICE_NAME, input.signingSecret)
  const response = await fetch(input.url, {
    body: body === '' ? undefined : body,
    headers,
    method: input.method,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  return response.json()
}
