Security Headers And CORS

Этот документ объясняет web security headers и CORS.

Security headers

Headers помогают браузеру безопаснее открывать сайт.

Они защищают от части атак:

- XSS;
- clickjacking;
- MIME sniffing;
- лишней передачи referrer.

CORS

CORS решает, какие сайты могут делать browser requests к API.

Главное правило

Internal services не должны быть доступны браузеру напрямую.

Если нужен browser API, он должен быть явно спроектирован и защищен.
