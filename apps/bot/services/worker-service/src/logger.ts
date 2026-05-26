import { createLogger } from '@metrix/logger'

export const logger = createLogger('worker-service')
export type WorkerLogger = typeof logger
