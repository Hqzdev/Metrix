import { createLogger } from '@metrix/logger'

export const logger = createLogger('payment-service')
export type PaymentServiceLogger = typeof logger
 