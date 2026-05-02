import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Replicates AES-256-GCM encrypt/decrypt used in calendar-service
function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

function encrypt(value: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`
}

function decrypt(value: string, secret: string): string {
  const [iv, tag, enc] = value.split('.').map((p) => Buffer.from(p, 'base64'))
  const d = createDecipheriv('aes-256-gcm', keyFrom(secret), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}

test('encrypt then decrypt returns original token', () => {
  const secret = 'test-secret-key'
  const token = 'ya29.a0AfH6SMC-fake-google-access-token'
  assert.equal(decrypt(encrypt(token, secret), secret), token)
})

test('encrypted value differs from plaintext', () => {
  const token = 'refresh_token_value'
  const ciphertext = encrypt(token, 'secret')
  assert.notEqual(ciphertext, token)
})

test('same input produces different ciphertext each time (random IV)', () => {
  const token = 'same-token'
  const secret = 'same-secret'
  const c1 = encrypt(token, secret)
  const c2 = encrypt(token, secret)
  assert.notEqual(c1, c2)
})

test('ciphertext format is iv.tag.enc (three dot-separated base64 segments)', () => {
  const ciphertext = encrypt('some-token', 'secret')
  const parts = ciphertext.split('.')
  assert.equal(parts.length, 3)
  for (const part of parts) {
    assert.ok(part.length > 0)
    assert.doesNotThrow(() => Buffer.from(part, 'base64'))
  }
})

test('decrypting with wrong secret throws', () => {
  const ciphertext = encrypt('access-token', 'correct-secret')
  assert.throws(() => decrypt(ciphertext, 'wrong-secret'))
})

test('tampered auth tag causes decryption to throw', () => {
  const ciphertext = encrypt('access-token', 'secret')
  const [iv, , enc] = ciphertext.split('.')
  const fakeTag = Buffer.alloc(16, 0xff).toString('base64')
  assert.throws(() => decrypt(`${iv}.${fakeTag}.${enc}`, 'secret'))
})

test('encrypts empty string without error', () => {
  const secret = 'secret'
  assert.equal(decrypt(encrypt('', secret), secret), '')
})

test('encrypts long refresh token', () => {
  const secret = 'prod-calendar-token-secret'
  const longToken = 'x'.repeat(512)
  assert.equal(decrypt(encrypt(longToken, secret), secret), longToken)
})
