import assert from 'node:assert/strict'
import test from 'node:test'
import { createOrder, moveOrder } from '../src/orders.js'

test('createOrder totals the items', () => {
  const order = createOrder('u1', [
    { price: 2.5, qty: 2 },
    { price: 3, qty: 1 },
  ])
  assert.equal(order.total, 8)
  assert.equal(order.status, 'pending')
})

test.skip('a shipped order cannot be cancelled', () => {
  assert.throws(() => moveOrder({ status: 'shipped' }, 'cancelled'))
})
