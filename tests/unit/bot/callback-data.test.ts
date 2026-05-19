import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCallbackData } from '../../../apps/bot/services/bot-gateway/src/callback-data.js'

test('callback data parser accepts known short commands and rejects malformed payloads', () => {
  assert.deepEqual(parseCallbackData('confirm:room-1:room-1m'), {
    type: 'confirm',
    resourceId: 'room-1',
    slotId: 'room-1m',
  })

  assert.deepEqual(parseCallbackData('calendar:disconnect:google'), {
    type: 'calendar_disconnect',
    provider: 'google',
  })

  assert.equal(parseCallbackData('confirm:room-1'), null)
  assert.equal(parseCallbackData('calendar:disconnect:yandex'), null)
  assert.equal(parseCallbackData(`confirm:${'a'.repeat(80)}:slot`), null)
  assert.equal(parseCallbackData('confirm:room/1:slot'), null)
})
