// Public contracts
export type * from './contracts/index.js'

// Database access
export { prisma } from './database/prisma-client.js'

// Admin module
export { validateUpdateLocationRequest, validateUpdateResourceRequest } from './modules/admin/admin-validators.js'

// Booking module
export { BookingRepository } from './modules/bookings/booking-repository.js'
export { createBooking } from './modules/bookings/create-booking.js'
export {
  validateCancelBookingRequest,
  validateCreateBookingRequest,
  validateRescheduleBookingRequest,
} from './modules/bookings/booking-validators.js'

// Queues
export { createBookingReminderQueue, createBookingReminderWorker, enqueueBookingReminderJob } from './queues/booking-reminder-queue.js'
export { createCalendarSyncQueue, createCalendarSyncWorker, enqueueCalendarSyncJob } from './queues/calendar-sync-queue.js'
export { queueNames } from './queues/queue-names.js'

// Realtime
export { AvailabilityHub } from './realtime/availability-hub.js'

// Auth
export { authenticateRequest, requireAdmin } from './shared/auth/auth-guard.js'
export type { AuthResult, AuthUser } from './shared/auth/auth-guard.js'
export { createJwt, verifyJwt } from './shared/auth/jwt.js'
export type { JwtKey, JwtSecrets, VerifyJwtResult } from './shared/auth/jwt.js'
export { checkLoginAllowed, recordFailedLogin, resetLoginAttempts } from './shared/auth/login-rate-limiter.js'
export type { LoginCheckResult } from './shared/auth/login-rate-limiter.js'
export { hashPassword, verifyPassword } from './shared/auth/password.js'
export { createSession, deleteSession, rotateSession } from './shared/auth/session-service.js'
export type { RotateSessionResult } from './shared/auth/session-service.js'
export { isAccessTokenRevoked, revokeAccessToken } from './shared/auth/token-blacklist.js'

// Events
export { bookingEventBus, bookingEventNames, createBookingEventPayload } from './shared/events/booking-events.js'
export { registerBookingEventHandlers } from './shared/events/register-booking-event-handlers.js'

// Redis
export { createRedisConnection } from './shared/redis/redis-client.js'
