/**
 * Shared runtime contract types for bot-facing services.
 *
 * The package groups booking, payment, calendar, analytics, reporting, and
 * stream payload contracts so service implementations and tests can agree on
 * the same TypeScript shapes.
 *
 * @packageDocumentation
 */

export * from './analytics.js'
export * from './booking.js'
export * from './calendar.js'
export * from './events.js'
export * from './payment.js'
export * from './reports.js'
export * from './streams.js'
