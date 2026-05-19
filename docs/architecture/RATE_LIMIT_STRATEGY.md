Rate Limit Strategy

Этот документ описывает rate limit policy для guest, admin и internal traffic.

Назначение

Rate limit защищает bot-gateway и внутренние сервисы от accidental abuse, retry storms и слишком частых Telegram updates.
Rate limit не заменяет authentication, replay protection или idempotency.

Текущая реализация

Bot-gateway использует Redis fixed window.

Лимит:

10 requests / 10 seconds per Telegram user

Ключ:

ratelimit:{userId}:{window}

TTL:

10 seconds

Таблица лимитов

| Actor | Entry point | Limit | Key | Enforcement | Status |
| --- | --- | --- | --- | --- | --- |
| guest Telegram user | bot-gateway Telegram update handler | 10 requests / 10 seconds | Telegram user id | Redis fixed window | implemented |
| admin Telegram user | bot-gateway admin commands | 10 requests / 10 seconds | Telegram user id | Redis fixed window before command handling | implemented |
| internal service | signed service-to-service HTTP | no rate limit today | X-Request-Id replay key only | HMAC + replay protection | planned |
| public web guest | future public API | not defined | IP or user id | gateway / edge / app middleware | planned |
| admin web user | future admin API | not defined | admin user id | app middleware + audit | planned |

Rules

Guest and admin Telegram users share the same bot-gateway limiter today.
Admin permission does not bypass rate limit.
Internal services rely on HMAC, replay protection and idempotency today.
If internal rate limits are added, they must be per caller service and endpoint class.

Failure behavior

If user exceeds the limit, bot replies:

Too many requests.

If Redis is unavailable, bot-gateway should fail safely for rate-limited flows.
Production must not silently disable rate limiting.

Future internal limits

Recommended starting point:

| Caller | Target | Limit | Reason |
| --- | --- | --- | --- |
| bot-gateway | booking-service reads | 60 requests / minute per Telegram user | browsing slots |
| bot-gateway | booking-service writes | 10 requests / minute per Telegram user | booking attempts |
| payment-service | booking-service create booking | 30 requests / minute per service instance | payment completion |
| admin-service | DLQ replay | 10 requests / minute per admin actor | operator safety |
| admin-service | payment recovery | 10 requests / minute per admin actor | operator safety |

Связанные документы

docs/architecture/SECURITY.md
docs/security/README.md
docs/architecture/CACHING_STRATEGY.md
