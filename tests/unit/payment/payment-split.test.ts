import assert from 'node:assert/strict'
import { test } from 'node:test'

// Replicates payment-service split logic (MAX_INVOICE = 9_900_000 minor units = 99 000 ₽)
const MAX_INVOICE = 9_900_000

function splitPayment(total: number): { parts: number; firstAmount: number } {
  return {
    parts: Math.ceil(total / MAX_INVOICE),
    firstAmount: Math.min(MAX_INVOICE, total),
  }
}

function nextAmount(total: number, alreadyPaid: number): number {
  return Math.min(MAX_INVOICE, total - alreadyPaid)
}

function isFullyPaid(total: number, alreadyPaid: number): boolean {
  return alreadyPaid >= total
}

test('payment below limit → 1 part, full amount sent at once', () => {
  const { parts, firstAmount } = splitPayment(5_000_000)
  assert.equal(parts, 1)
  assert.equal(firstAmount, 5_000_000)
})

test('payment exactly at limit → 1 part', () => {
  const { parts, firstAmount } = splitPayment(MAX_INVOICE)
  assert.equal(parts, 1)
  assert.equal(firstAmount, MAX_INVOICE)
})

test('payment 1 minor unit above limit → 2 parts', () => {
  const total = MAX_INVOICE + 1
  const { parts, firstAmount } = splitPayment(total)
  assert.equal(parts, 2)
  assert.equal(firstAmount, MAX_INVOICE)
})

test('payment exactly 2× limit → 2 equal parts', () => {
  const total = MAX_INVOICE * 2
  const { parts, firstAmount } = splitPayment(total)
  assert.equal(parts, 2)
  assert.equal(firstAmount, MAX_INVOICE)
  const second = nextAmount(total, firstAmount)
  assert.equal(second, MAX_INVOICE)
})

test('payment 2× limit + 1 → 3 parts, third part is 1', () => {
  const total = MAX_INVOICE * 2 + 1
  const { parts, firstAmount } = splitPayment(total)
  assert.equal(parts, 3)
  const secondAmount = nextAmount(total, firstAmount)
  assert.equal(secondAmount, MAX_INVOICE)
  const thirdAmount = nextAmount(total, firstAmount + secondAmount)
  assert.equal(thirdAmount, 1)
})

test('sum of all parts equals total', () => {
  const total = 25_000_000
  let paid = 0
  const { firstAmount } = splitPayment(total)
  paid += firstAmount
  while (!isFullyPaid(total, paid)) {
    paid += nextAmount(total, paid)
  }
  assert.equal(paid, total)
})

test('isFullyPaid returns true when paid equals total', () => {
  assert.equal(isFullyPaid(5_000_000, 5_000_000), true)
})

test('isFullyPaid returns false when paid is less than total', () => {
  assert.equal(isFullyPaid(5_000_000, 4_999_999), false)
})

test('zero price → 0 parts (edge: no charge needed)', () => {
  const { parts, firstAmount } = splitPayment(0)
  assert.equal(parts, 0)
  assert.equal(firstAmount, 0)
})
