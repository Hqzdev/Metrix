import { ProviderError } from './errors.js'

// Endpoint обмена authorization code или refresh token на access token.
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
// Endpoint отзыва токена при отключении календаря.
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
// Endpoint, куда отправляем пользователя для Google consent.
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
// Права, которые нужны сервису: создавать события и читать занятость.
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy'
// Максимальное ожидание ответа Google.
const REQUEST_TIMEOUT_MS = 10_000

// SSRF guard: только эти хосты доступны для OAuth-запросов.
const ALLOWED_EXTERNAL_HOSTS = new Set(['oauth2.googleapis.com', 'accounts.google.com'])

// Ответ Google при первичном обмене code на tokens.
export type GoogleTokenResponse = {
  // Короткоживущий token для API-запросов.
  access_token: string
  // Через сколько секунд access token истечёт.
  expires_in?: number
  // Долгоживущий token для обновления access token.
  refresh_token?: string
}

// Ответ Google при refresh access token.
export type GoogleRefreshResponse = {
  // Новый access token.
  access_token: string
  // Сколько секунд он будет жить.
  expires_in?: number
}

// Настройки Google OAuth приложения.
export type GoogleOAuthClientConfig = {
  // OAuth client id.
  clientId: string
  // OAuth client secret.
  clientSecret: string
  // Redirect URI, зарегистрированный в Google Cloud.
  redirectUri: string
}

/**
 * Выполняет OAuth-запросы к Google Calendar API.
 *
 * Важно:
 * - SSRF guard проверяется явно — конфигурационная ошибка не откроет
 *   доступ к внутренней сети через OAuth endpoint.
 * - timeout 10s: медленный ответ Google не должен блокировать запрос indefinitely.
 * - revokeToken вызывается при disconnect — токен инвалидируется на стороне Google,
 *   удаление из БД недостаточно.
 */
export class GoogleOAuthClient {
  /**
   * Сохраняет настройки Google OAuth приложения.
   */
  constructor(private readonly config: GoogleOAuthClientConfig) {}

  /**
   * Строит ссылку, по которой пользователь разрешает доступ к календарю.
   */
  buildAuthUrl(state: string): string {
    // access_type=offline просит Google вернуть refresh_token.
    const params = new URLSearchParams({
      access_type: 'offline',
      client_id: this.config.clientId,
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      state,
    })
    return `${AUTH_ENDPOINT}?${params}`
  }

  /**
   * Обменивает authorization code на access и refresh токены.
   *
   * Бросает ошибку при любом не-2xx ответе от Google, чтобы
   * caller не получил undefined токен при сбое.
   *
   * Бросает ошибку если Google не вернул refresh_token — это означает,
   * что consent не был получен и сохранять нечего.
   */
  async exchangeCode(code: string): Promise<GoogleTokenResponse & { refresh_token: string }> {
    // Endpoint фиксированный, но всё равно проверяем host.
    const target = new URL(TOKEN_ENDPOINT)
    this.assertAllowedHost(target.hostname)

    // Google ждёт application/x-www-form-urlencoded, не JSON.
    const response = await fetch(target.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Любой неуспешный ответ означает, что токены использовать нельзя.
    if (!response.ok) {
      const responseBody = await readResponseBody(response)
      throw new ProviderError(response.status, responseBody)
    }

    // Парсим JSON-ответ Google.
    const token = (await response.json()) as GoogleTokenResponse

    // refresh_token выдаётся только при первом consent или при prompt=consent.
    // Если его нет — сохранять нечего, подключение не создаётся.
    if (!token.refresh_token) {
      throw new ProviderError(502, { error: 'Google did not return a refresh_token — re-authorization required with prompt=consent' })
    }

    return token as GoogleTokenResponse & { refresh_token: string }
  }

  /**
   * Обновляет access token через refresh token.
   *
   * Вызывается когда expiresAt < now. Возвращает новый access_token и expires_in.
   * Refresh token при этом не меняется (Google не ротирует его при обычном refresh).
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleRefreshResponse> {
    // Refresh тоже идёт в token endpoint.
    const target = new URL(TOKEN_ENDPOINT)
    this.assertAllowedHost(target.hostname)

    // Отправляем refresh_token и client credentials.
    const response = await fetch(target.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Если Google не обновил token, caller должен увидеть ошибку.
    if (!response.ok) {
      const responseBody = await readResponseBody(response)
      throw new ProviderError(response.status, responseBody)
    }

    return response.json() as Promise<GoogleRefreshResponse>
  }

  /**
   * Отзывает токен на стороне Google.
   *
   * Принимает refresh token (предпочтительно) или access token.
   * Вызывать перед удалением CalendarConnection из БД — иначе refresh token
   * остаётся валидным на стороне Google даже после disconnect.
   *
   * Ошибка revoke логируется, но не прерывает disconnect: пользователь должен
   * иметь возможность отключить аккаунт даже если Google API недоступен.
   */
  async revokeToken(token: string): Promise<void> {
    // Revoke endpoint фиксированный и проходит SSRF guard.
    const target = new URL(REVOKE_ENDPOINT)
    this.assertAllowedHost(target.hostname)

    // Google принимает token в query-параметре.
    const response = await fetch(`${target.toString()}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // 200 — токен отозван
    // 400 — токен уже истёк или не существует — не ошибка с точки зрения disconnect
    if (!response.ok && response.status !== 400) {
      const responseBody = await readResponseBody(response)
      throw new ProviderError(response.status, responseBody)
    }
  }

  /**
   * Проверяет, что HTTP-запрос уйдёт только на разрешённый Google host.
   */
  private assertAllowedHost(hostname: string): void {
    if (!ALLOWED_EXTERNAL_HOSTS.has(hostname)) {
      throw new Error(`SSRF guard: disallowed host ${hostname}`)
    }
  }
}

/**
 * Читает тело ответа Google без потери диагностики.
 */
async function readResponseBody(response: Response): Promise<unknown> {
  try {
    // Google OAuth API обычно возвращает JSON с error/error_description.
    return await response.clone().json()
  } catch {
    return { error: await response.text() }
  }
}
