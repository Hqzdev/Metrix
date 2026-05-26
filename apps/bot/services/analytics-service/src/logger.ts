import { createLogger } from '@metrix/logger'

export const logger = createLogger('analytics-service')
export type AnalyticsServiceLogger = typeof logger
 