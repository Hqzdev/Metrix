import { createLogger } from '@metrix/logger'

export const logger = createLogger('admin-service')
export type AdminServiceLogger = typeof logger
