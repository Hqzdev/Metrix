import { buildAuthHeaders } from '@metrix/auth'

// Максимальное время ожидания ответа от другого сервиса.
const REQUEST_TIMEOUT_MS = 5_000
// Это имя попадёт в подпись исходящего service-to-service запроса.
const SERVICE_NAME = 'admin-service'

// Узкий интерфейс клиента: router знает только эти три HTTP-действия.
export type SignedHttpClient = {
  /**
   * Делает GET-запрос и возвращает JSON-тело ответа.
   */
  getJson(url: string): Promise<unknown>
  /**
   * Делает PATCH-запрос с JSON-телом и возвращает JSON-тело ответа.
   */
  patchJson(url: string, body: unknown): Promise<unknown>
  /**
   * Делает POST-запрос с JSON-телом и возвращает тело плюс HTTP-код.
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
     * GET не отправляет тело, поэтому передаём только метод, secret и URL.
     */
    getJson(url) {
      return requestJson({ method: 'GET', signingSecret, url })
    },

    /**
     * PATCH используется для частичного обновления сущностей.
     */
    patchJson(url, body) {
      return requestJson({ body, method: 'PATCH', signingSecret, url })
    },

    /**
     * POST создаёт или запускает действие в другом сервисе.
     */
    async postJson(url, body) {
      const responseBody = await requestJson({ body, method: 'POST', signingSecret, url })
      // Внутренний контракт admin-router ожидает statusCode рядом с body.
      return { body: responseBody, statusCode: 201 }
    },
  }
}

// Все данные, нужные для одного исходящего HTTP-запроса.
type RequestJsonInput = {
  // body есть только у PATCH/POST.
  body?: unknown
  // Разрешаем только методы, которые реально нужны этому сервису.
  method: 'GET' | 'PATCH' | 'POST'
  // Секрет для подписи запроса.
  signingSecret: string
  // Полный URL downstream-сервиса.
  url: string
}

/**
 * Выполняет HTTP-запрос, парсит JSON и нормализует ошибки downstream-сервиса.
 */
async function requestJson(input: RequestJsonInput): Promise<unknown> {
  // Для GET body не нужен, для PATCH/POST сериализуем объект в JSON.
  const body = input.body === undefined ? '' : JSON.stringify(input.body)
  // URL парсим отдельно, потому что подпись использует pathname.
  const parsedUrl = new URL(input.url)
  // Заголовки доказывают downstream-сервису, кто отправил запрос и что тело не подменили.
  const headers = buildAuthHeaders(input.method, parsedUrl.pathname, body, SERVICE_NAME, input.signingSecret)
  const response = await fetch(input.url, {
    // fetch не любит пустое тело у GET, поэтому undefined вместо пустой строки.
    body: body === '' ? undefined : body,
    headers,
    method: input.method,
    // Таймаут защищает admin-service от зависания из-за downstream-сервиса.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  // Downstream-сервисы в этом проекте возвращают JSON, поэтому сразу парсим ответ.
  return response.json()
}
