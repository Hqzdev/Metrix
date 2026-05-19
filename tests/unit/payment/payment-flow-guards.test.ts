import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const paymentRouterSource = readFileSync('apps/bot/services/payment-service/src/payment-router.ts', 'utf8')

test('payment router keeps invoices as status records and exposes compensation flow', () => {
  assert.equal(paymentRouterSource.includes('pendingInvoice.delete'), false)
  assert.ok(paymentRouterSource.includes("status: 'completed'"))
  assert.ok(paymentRouterSource.includes("status: 'paid_part'"))
  assert.ok(paymentRouterSource.includes('compensateSaga'))
  assert.ok(paymentRouterSource.includes('payment.compensation_started'))
})
