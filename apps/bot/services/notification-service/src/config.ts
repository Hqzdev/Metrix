const DEFAULT_REDIS_URL = 'redis://localhost:6379'

// единственная директория, из которой разрешено отправлять файлы пользователям
export const REPORTS_DIR = '/reports'

export type NotificationServiceConfig = {
  redisUrl: string
  telegramBotToken: string
  telegramBaseUrl: string
}

/**
 * Читает и валидирует конфигурацию при старте процесса.
 *
 * TELEGRAM_BOT_TOKEN проверяется сразу — без него сервис не может
 * отправлять сообщения и его запуск бессмысленен.
 */
export function readNotificationServiceConfig(env: NodeJS.ProcessEnv): NotificationServiceConfig {
  const telegramBotToken = requireEnv(env, 'TELEGRAM_BOT_TOKEN')

  return {
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    telegramBotToken,
    telegramBaseUrl: `https://api.telegram.org/bot${telegramBotToken}`,
  }
}

/**
 * Возвращает обязательную переменную окружения или падает при пустом значении.
 */
function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`)
  }

  return value
}
