import { randomBytes } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware генерирует уникальный nonce для каждого запроса и проставляет
 * строгий Content-Security-Policy на основе этого nonce.
 *
 * Почему middleware, а не next.config.mjs:
 * - статический CSP в next.config.mjs не может содержать nonce — nonce должен
 *   быть разным для каждого запроса, иначе теряется смысл защиты.
 * - middleware запускается на edge runtime до рендера страницы, поэтому
 *   nonce доступен и в заголовке ответа, и в server component через headers().
 *
 * Как использовать nonce в layout.tsx:
 *   import { headers } from 'next/headers'
 *   const nonce = (await headers()).get('x-nonce') ?? ''
 *   <Script nonce={nonce} ... />
 */
export function middleware(request: NextRequest): NextResponse {
  // 16 случайных байт → 22 символа base64url — достаточная длина для nonce
  const nonce = randomBytes(16).toString('base64url')

  // строим CSP с nonce вместо unsafe-inline и без unsafe-eval
  const csp = buildCsp(nonce)

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        // передаём nonce в layout через заголовок запроса
        'x-nonce': nonce,
      }),
    },
  })

  // CSP ставим в заголовок ответа — именно его видит браузер
  response.headers.set('Content-Security-Policy', csp)

  return response
}

/**
 * Строит строку CSP с nonce для script-src.
 *
 * Что убрано по сравнению со старой конфигурацией:
 * - unsafe-eval: разрешал eval() и Function() — основной XSS вектор через инъекцию скриптов.
 * - unsafe-inline для скриптов: заменён на nonce — только скрипты с правильным nonce выполнятся.
 *
 * style-src 'unsafe-inline' оставлен: Tailwind и CSS-in-JS генерируют inline-стили,
 * убрать их без серьёзного рефакторинга нельзя. Для стилей риск ниже, чем для скриптов.
 */
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // style-src: unsafe-inline нужен для Tailwind — убираем только когда перейдём на CSS modules
    "style-src 'self' 'unsafe-inline'",
    // script-src: nonce вместо unsafe-inline, без unsafe-eval
    `script-src 'self' 'nonce-${nonce}'`,
    "connect-src 'self' https: wss:",
  ]

  return directives.join('; ')
}

export const config = {
  // middleware работает на всех маршрутах, кроме статических файлов и api routes
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
