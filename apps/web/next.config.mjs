import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const appDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(appDir))

// CSP управляется в proxy.ts — там генерируется nonce для каждого запроса.
// Здесь оставляем только заголовки, которые не зависят от nonce и безопасны
// как статические (HSTS, X-Frame-Options и т.д.).
const staticSecurityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    // HSTS: браузер всегда использует HTTPS для этого домена (2 года)
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // запрещает вставку страницы в iframe — защита от clickjacking
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // запрещает браузеру угадывать MIME-тип — защита от MIME sniffing атак
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // отключаем API браузера, которые не используются
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: repoRoot,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
    ]
  },
}

export default nextConfig
