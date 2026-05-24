// Максимум сообщений за один XREADGROUP — ограничивает размер batch в памяти.
export const READ_BATCH_SIZE = 10

// Время ожидания новых сообщений в BLOCK — баланс между latency и CPU.
export const BLOCK_TIMEOUT_MS = 5_000

// Попытки доставки до отправки в dead-letter queue.
export const MAX_DELIVERY_ATTEMPTS = 5

// Время, после которого pending-сообщение считается зависшим и может быть XCLAIM-нуто.
export const PENDING_CLAIM_IDLE_MS = 30_000
