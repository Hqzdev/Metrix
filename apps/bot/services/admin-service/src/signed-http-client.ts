import { buildAuthHeaders } from '@metrix/auth'
import { DownstreamError } from './errors.js'

// Максимальное время ожидания ответа от другого сервиса.
const REQUEST_TIMEOUT_MS = 5_000
// Это имя попадёт в подпись исходящего service-to-service запроса.
const SERVICE_NAME = 'admin-service'

// Узкий интерфейс клиента: router знает только эти три HTTP-действия.
export type SignedHttpClient = {
  /**
   * Делает GET-запрос и возвращает JSON-тело ответа.
   * Бросает DownstreamError, если сервис вернул нештатный статус.
   */
  getJson(url: string): Promise<unknown>
  /**
   * Делает PATCH-запрос с JSON-телом и возвращает JSON-тело ответа.
   * Бросает DownstreamError, если сервис вернул нештатный статус.
   */
  patchJson(url: string, body: unknown): Promise<unknown>
  /**
   * Делает POST-запрос с JSON-телом и возвращает тело плюс реальный HTTP-код.
   * Бросает DownstreamError, если сервис вернул нештатный статус.
   */
  postJson(url: string, body: unknown): Promise<{ body: unknown; statusCode: number }>
}

/**
 * Создаёт HTTP-клиент, который подписывает каждый downstream-запрос.
 *
 * Admin-service меняет привилегированные данные через booking-service,
 * analytics-service и payment-service, поэтому исходящие запросы обязаны
 * иметь service-to-service auth.
 *
 * При нештатном ответе downstream-а бросается DownstreamError с реальным
 * статус-кодом — это позволяет handleError в admin-router пробросить его
 * клиенту без маскировки под 200 или 500.
 */
export function createSignedHttpClient(signingSecret: string): SignedHttpClient {
  return {
    /**
     * GET не отправляет тело, поэтому передаём только метод, secret и URL.
     * Возвращает распарсенное тело ответа или бросает DownstreamError.
     */
    async getJson(url) {
      const result = await requestJson({ method: 'GET', signingSecret, url })
      return result.body
    },

    /**
     * PATCH используется для частичного обновления сущностей.
     * Возвращает распарсенное тело ответа или бросает DownstreamError.
     */
    async patchJson(url, body) {
      const result = await requestJson({ body, method: 'PATCH', signingSecret, url })
      return result.body
    },

    /**
     * POST создаёт или запускает действие в другом сервисе.
     * Возвращает тело и реальный HTTP-код, который вернул downstream.
     * Это важно: создание report-а в analytics-service возвращает 201,
     * и клиент должен увидеть именно 201, а не хардкод.
     */
    async postJson(url, body) {
      return requestJson({ body, method: 'POST', signingSecret, url })
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

// Нормализованный ответ: тело всегда распарсено, код всегда есть.
type RequestJsonOutput = {
  body: unknown
  statusCode: number
}

/**
 * Выполняет HTTP-запрос, парсит JSON и нормализует ошибки downstream-сервиса.
 *
 * При любом нештатном HTTP-коде (4xx, 5xx) бросает DownstreamError с реальным
 * statusCode и телом ответа. Это позволяет вышестоящему коду либо пробросить
 * ошибку клиенту, либо обработать её специфично для конкретного маршрута.
 *
 * Тело всегда читается через .json() — downstream-сервисы этого проекта
 * возвращают JSON даже для ошибочных ответов. Если тело не является
 * корректным JSON, пробрасывается исходный parse-error.
 */
async function requestJson(input: RequestJsonInput): Promise<RequestJsonOutput> {
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

  // Сначала парсим тело — оно нужно и для успешных, и для ошибочных ответов.
  const responseBody = await response.json()

  // Нештатный код означает, что downstream отклонил запрос.
  // Бросаем DownstreamError, чтобы handleError в роутере мог пробросить
  // реальный статус клиенту вместо маскировки под 500.
  if (!response.ok) {
    throw new DownstreamError(response.status, responseBody)
  }

  return { body: responseBody, statusCode: response.status }
}
