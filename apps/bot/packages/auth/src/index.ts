/**
 * Authentication and request-boundary helpers shared by bot microservices.
 *
 * Exports HMAC service-to-service signatures, signed Telegram user identity,
 * OAuth state signing, request body readers, audit helpers, and traceparent
 * utilities.
 *
 * @packageDocumentation
 */

export { audit } from './audit.js'
export { readBody, readJsonBody } from './body.js'
export { MAX_BODY_BYTES, MAX_DRIFT_MS } from './constants.js'
export { signOAuthState, verifyOAuthState } from './oauth-state.js'
export { buildAuthHeaders, verifyServiceRequest } from './service-signature.js'
// traceparent helpers keep distributed traces connected across services.
export { createTraceparent, readTraceparent } from './trace.js'
export { extractUserId, signUserId } from './user-id.js'
export type { AuditEntry, OAuthStateData, TrustedCaller, VerifyResult } from './types.js'
