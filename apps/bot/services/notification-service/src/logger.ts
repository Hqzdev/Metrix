import { createLogger } from '@metrix/logger'

export const logger = createLogger('notification-service')
export type NotificationServiceLogger = typeof logger
