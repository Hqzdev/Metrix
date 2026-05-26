import { createLogger } from '@metrix/logger'

// Единый structured logger с автоматической инъекцией traceId, spanId, env, hostname, pid.
export const logger = createLogger('booking-service')
export type BookingServiceLogger = typeof logger
 