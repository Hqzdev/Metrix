// Сколько ждём graceful shutdown перед принудительным exit.
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000

// Buckets для HTTP latency histogram в миллисекундах.
export const LATENCY_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000]
