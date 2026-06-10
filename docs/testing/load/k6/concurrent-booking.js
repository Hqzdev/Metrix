import { check, sleep } from 'k6'
import crypto from 'k6/crypto'
import http from 'k6/http'
import { Counter, Rate } from 'k6/metrics'

const BASE_URL = (__ENV.BOOKING_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '')
const RESOURCE_ID = __ENV.RESOURCE_ID
const SLOT_ID = __ENV.SLOT_ID
const SERVICE_NAME = __ENV.SERVICE_NAME || 'bot-gateway'
const SIGNING_SECRET = __ENV.SERVICE_SIGNING_SECRET || 'dev-secret'
const USER_ID_SIGNING_SECRET = __ENV.USER_ID_SIGNING_SECRET || SIGNING_SECRET
const USER_ID_START = Number(__ENV.USER_ID_START || 900000)
const VUS = Number(__ENV.VUS || 20)
const ITERATIONS = Number(__ENV.ITERATIONS || VUS)
const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`

if (!RESOURCE_ID || !SLOT_ID) {
  throw new Error('RESOURCE_ID and SLOT_ID are required for the concurrent booking race scenario')
}

export const bookingRaceExpected = new Rate('booking_race_expected')
export const bookingRaceCreated = new Counter('booking_race_created')
export const bookingRaceConflict = new Counter('booking_race_conflict')

http.setResponseCallback(http.expectedStatuses(201, 409))

export const options = {
  scenarios: {
    concurrent_booking_race: {
      executor: 'shared-iterations',
      iterations: ITERATIONS,
      maxDuration: '30s',
      vus: VUS,
    },
  },
  thresholds: {
    booking_race_conflict: [`count>=${Math.max(0, ITERATIONS - 1)}`],
    booking_race_created: ['count>=1'],
    booking_race_expected: ['rate>0.99'],
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const telegramUserId = USER_ID_START + (__VU * 1000) + __ITER
  const path = '/bookings'
  const body = JSON.stringify({
    idempotencyKey: `k6-booking-race-${RUN_ID}-${__VU}-${__ITER}`,
    resourceId: RESOURCE_ID,
    slotId: SLOT_ID,
    telegramUserId,
  })

  const response = http.post(`${BASE_URL}${path}`, body, {
    headers: {
      ...serviceAuthHeaders('POST', path, body),
      ...userIdHeaders(telegramUserId),
    },
    tags: {
      scenario: 'concurrent_booking_race',
    },
  })

  const expectedStatus = response.status === 201 || response.status === 409
  bookingRaceExpected.add(expectedStatus)

  if (response.status === 201) {
    bookingRaceCreated.add(1)
  }

  if (response.status === 409) {
    bookingRaceConflict.add(1)
  }

  check(response, {
    'race produces one create or protected conflict': (res) => res.status === 201 || res.status === 409,
  })

  sleep(0.1)
}

function serviceAuthHeaders(method, path, body = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const requestId = requestIdForIteration()
  const bodyHash = crypto.sha256(body, 'hex')
  const message = [method.toUpperCase(), path, timestamp, requestId, bodyHash].join('\n')
  const signature = crypto.hmac('sha256', SIGNING_SECRET, message, 'hex')

  return {
    'content-type': 'application/json',
    'x-request-id': requestId,
    'x-service-name': SERVICE_NAME,
    'x-signature': signature,
    'x-timestamp': timestamp,
  }
}

function userIdHeaders(userId) {
  const value = String(userId)

  return {
    'x-user-id': value,
    'x-user-sig': crypto.hmac('sha256', USER_ID_SIGNING_SECRET, value, 'hex'),
  }
}

function requestIdForIteration() {
  return `k6-${RUN_ID}-${__VU}-${__ITER}-${Math.random().toString(16).slice(2)}`
}
