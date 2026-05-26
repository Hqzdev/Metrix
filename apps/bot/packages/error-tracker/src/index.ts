// Публичное API пакета @metrix/error-tracker.
// Сервисы импортируют только то, что реально используют.

export { errorTracker, ErrorTracker } from './tracker.js'
export { readErrorTrackerConfig } from './config.js'
export type { ErrorExtras, ErrorTrackerConfig, RequestContext } from './types.js'
