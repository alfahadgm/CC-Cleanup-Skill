export function formatLegacyInvoice(order) {
  return `INVOICE ${order.uid} ${order.total}`
}
