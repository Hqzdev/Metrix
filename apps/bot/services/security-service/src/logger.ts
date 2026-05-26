import { createLogger } from '@metrix/logger'

export const logger = createLogger('security-service')
export type SecurityServiceLogger = typeof logger
