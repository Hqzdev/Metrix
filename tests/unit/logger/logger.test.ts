import { strict as assert } from 'node:assert'
import { describe, test } from 'node:test'
import { createLogger } from '../../../apps/bot/packages/logger/src/index.js'

type CapturedStreams = {
  stderr: string[]
  stdout: string[]
  restore(): void
}

function captureStreams(): CapturedStreams {
  const stdout: string[] = []
  const stderr: string[] = []
  const originalStdoutWrite = process.stdout.write
  const originalStderrWrite = process.stderr.write

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk))
    return true
  }) as typeof process.stdout.write

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk))
    return true
  }) as typeof process.stderr.write

  return {
    stdout,
    stderr,
    restore() {
      process.stdout.write = originalStdoutWrite
      process.stderr.write = originalStderrWrite
    },
  }
}

describe('@metrix/logger', () => {
  test('writes one structured JSON line with required fields to stdout', () => {
    const streams = captureStreams()

    try {
      const logger = createLogger('booking-service')
      logger.info({
        message: 'booking created',
        requestId: 'req_123',
        userId: 'user_456',
      })

      assert.equal(streams.stderr.length, 0)
      assert.equal(streams.stdout.length, 1)

      const payload = JSON.parse(streams.stdout[0]) as Record<string, unknown>

      assert.equal(payload.level, 'info')
      assert.equal(payload.service, 'booking-service')
      assert.equal(payload.message, 'booking created')
      assert.equal(payload.requestId, 'req_123')
      assert.equal(payload.userId, 'user_456')
      assert.equal(typeof payload.timestamp, 'string')
      assert.equal(typeof payload.env, 'string')
      assert.equal(typeof payload.hostname, 'string')
      assert.equal(typeof payload.pid, 'number')
    } finally {
      streams.restore()
    }
  })

  test('writes serialized errors to stderr', () => {
    const streams = captureStreams()

    try {
      const logger = createLogger('payment-service')
      logger.error({
        message: 'payment failed',
        requestId: 'req_789',
        error: new Error('provider timeout'),
      })

      assert.equal(streams.stdout.length, 0)
      assert.equal(streams.stderr.length, 1)

      const payload = JSON.parse(streams.stderr[0]) as {
        error: { message: string; name: string; stack?: string }
        level: string
        message: string
        requestId: string
        service: string
      }

      assert.equal(payload.level, 'error')
      assert.equal(payload.service, 'payment-service')
      assert.equal(payload.message, 'payment failed')
      assert.equal(payload.requestId, 'req_789')
      assert.equal(payload.error.message, 'provider timeout')
      assert.equal(payload.error.name, 'Error')
      assert.equal(typeof payload.error.stack, 'string')
    } finally {
      streams.restore()
    }
  })
})
