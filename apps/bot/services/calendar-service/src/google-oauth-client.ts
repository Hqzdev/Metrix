const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy'
const REQUEST_TIMEOUT_MS = 10_000

// SSRF guard: только эти хосты доступны для OAuth-запросов
const ALLOWED_EXTERNAL_HOSTS = new Set(['oauth2.googleapis.com', 'accounts.google.com'])

export type GoogleTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
}

export type GoogleRefreshResponse = {
  access_token: string
  expires_in?: number
}

export type GoogleOAuthClientConfig = {
  clientId: string
  clientSecret: string
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
   * Сохраняет зависимости класса для последующих обработчиков.
   */
  constructor(private readonly config: GoogleOAuthClientConfig) {}

  /**
   * Выполняет шаг buildAuthUrl внутри сервисного сценария.
   */
  buildAuthUrl(state: string): string {
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
    const target = new URL(TOKEN_ENDPOINT)
    this.assertAllowedHost(target.hostname)

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

    if (!response.ok) {
      throw new Error(`Google token exchange failed with status ${response.status}`)
    }

    const token = (await response.json()) as GoogleTokenResponse

    // refresh_token выдаётся только при первом consent или при prompt=consent.
    // Если его нет — сохранять нечего, подключение не создаётся.
    if (!token.refresh_token) {
      throw new Error('Google did not return a refresh_token — re-authorization required with prompt=consent')
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
    const target = new URL(TOKEN_ENDPOINT)
    this.assertAllowedHost(target.hostname)

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

    if (!response.ok) {
      throw new Error(`Google token refresh failed with status ${response.status}`)
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
    const target = new URL(REVOKE_ENDPOINT)
    this.assertAllowedHost(target.hostname)

    const response = await fetch(`${target.toString()}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // 200 — токен отозван
    // 400 — токен уже истёк или не существует — не ошибка с точки зрения disconnect
    if (!response.ok && response.status !== 400) {
      throw new Error(`Google token revocation failed with status ${response.status}`)
    }
  }

  /**
   * Выполняет шаг assertAllowedHost внутри сервисного сценария.
   */
  private assertAllowedHost(hostname: string): void {
    if (!ALLOWED_EXTERNAL_HOSTS.has(hostname)) {
      throw new Error(`SSRF guard: disallowed host ${hostname}`)
    }
  }
}
