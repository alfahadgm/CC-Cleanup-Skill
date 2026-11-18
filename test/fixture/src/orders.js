import { chargeCard } from './payments.js'

const transitions = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  cancelled: ['shipped'],
  shipped: [],
}

export function roundToCents(amount) {
  return Math.round(amount * 100) / 100
}

export function createOrder(userId, items) {
  const total = roundToCents(items.reduce((sum, item) => sum + item.price * item.qty, 0))
  return { uid: userId, items, total, status: 'pending' }
}

export function moveOrder(order, next) {
  if (!transitions[order.status].includes(next)) throw new Error(`cannot go from ${order.status} to ${next}`)
  return { ...order, status: next }
}

export async function payOrder(order) {
  try {
    await chargeCard(order.uid, order.total)
  } catch (e) {}
  return moveOrder(order, 'paid')
}
