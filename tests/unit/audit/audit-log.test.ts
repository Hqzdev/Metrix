import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeAuditLog } from '../../../apps/bot/packages/audit-log/src/index.js'

test('writeAuditLog stores actor id as bigint and serializes JSON payload safely', async () => {
  const prisma = new FakePrisma()
  const happenedAt = '2026-05-19T10:00:00.000Z'

  await writeAuditLog(prisma, {
    action: 'payment.completed',
    actorUserId: 123,
    entityId: 'inv-1',
    entityType: 'invoice',
    payload: {
      amount: 1000n,
      nested: { at: new Date(happenedAt) },
    },
    requestId: 'req-1',
    service: 'payment',
    ts: happenedAt,
  })

  assert.equal(prisma.last?.data.actorUserId, 123n)
  assert.equal(prisma.last?.data.ts?.toISOString(), happenedAt)
  assert.deepEqual(prisma.last?.data.payload, {
    amount: '1000',
    nested: { at: happenedAt },
  })
})

class FakePrisma {
  last: { data: Record<string, unknown> } | undefined

  auditLog = {
    create: async (input: { data: Record<string, unknown> }) => {
      this.last = input
      return input
    },
  }
}
