import { createLogger } from '@metrix/logger'

export const logger = createLogger('calendar-service')
export type CalendarServiceLogger = typeof logger
 