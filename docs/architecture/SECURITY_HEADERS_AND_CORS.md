Security Headers And CORS

Этот документ описывает HTTP security headers и CORS policy для Metrix.

Назначение

Security headers уменьшают риск XSS, clickjacking, MIME sniffing и утечки referrer.
CORS policy нужна, чтобы браузерные клиенты не получали доступ к API с неизвестных origins.

Граница применения

Web boundary:

apps/web

Internal services:

apps/bot/services/*

Internal services работают внутри Docker network и не должны быть доступны напрямую из браузера.
Поэтому CORS для них не является основным security layer.

Security headers

Headers задаются в:

apps/web/next.config.mjs

Текущий набор:

X-DNS-Prefetch-Control — разрешает DNS prefetch для web
Strict-Transport-Security — требует HTTPS для production-домена
X-Frame-Options — запрещает embedding через iframe
X-Content-Type-Options — запрещает MIME sniffing
Referrer-Policy — ограничивает передачу referrer
Permissions-Policy — запрещает camera, microphone, geolocation и payment
Content-Security-Policy — задаёт базовые источники script, style, image и connect

CSP

Текущий CSP оставляет unsafe-inline и unsafe-eval для совместимости с Next.js и dev runtime.
Это не финальная строгая CSP.

Усиление CSP:

1. убрать unsafe-eval в production, если runtime не требует eval
2. убрать unsafe-inline через nonce или hash
3. ограничить connect-src конкретными API-доменами
4. добавить report-uri или report-to после выбора collector

CORS policy

Правило по умолчанию:

browser clients используют same-origin web API
unknown origins запрещены
internal services не открываются наружу

Если появится публичный API:

1. добавить ALLOWED_ORIGINS
2. перечислить production и preview origins
3. запретить wildcard "*" для authenticated routes
4. разрешить только нужные methods
5. разрешить только нужные headers

Allowed methods для public API:

GET
POST
PATCH
DELETE
OPTIONS

Allowed headers для public API:

Authorization
Content-Type
X-Request-Id
X-Idempotency-Key

Credentials

Если API использует cookies, credentials разрешаются только для конкретных origins.
Если API использует Bearer tokens, credentials не включаются без необходимости.

Расширение

Добавление нового внешнего клиента:

1. описать origin
2. описать какие routes нужны клиенту
3. добавить origin в env provider
4. добавить тест preflight OPTIONS
5. обновить этот документ

Добавление нового header:

1. описать угрозу, которую закрывает header
2. добавить header в apps/web/next.config.mjs
3. проверить, что UI не ломается
4. обновить этот документ
