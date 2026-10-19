// Agregação por item, separada do fechamento de caixa (não inclui frete).
export function buildProductSales(orders = []) {
  const rows = [];
  const totals = new Map();
  for (const order of orders) {
    if (['canceled', 'cancelled'].includes(String(order?.status || '').toLowerCase())) continue;
    for (const item of (Array.isArray(order?.items) ? order.items : [])) {
      if (!item) continue;
      const quantity = Number(item.quantity ?? item.qty ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const unit = item.saleUnit === 'kg' ? 'kg' : 'un';
      const name = String(item.name || item.productName || 'Produto sem nome').trim();
      const key = (item.id || item.productId ? 'id:' + String(item.id || item.productId) : 'name:' + name.toLowerCase()) + '|' + unit;
      const price = Number(item.price ?? item.unitPrice ?? 0);
      const revenue = Number.isFinite(price) && price >= 0 ? Math.round(quantity * price * 100) / 100 : 0;
      const orderId = String(order.id || '');
      const date = order.createdAt?.toDate?.() || (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : null);
      rows.push({ key, name, unit, quantity, revenue, price, orderId, date });
      if (!totals.has(key)) totals.set(key, { key, name, unit, quantity: 0, revenue: 0, orders: new Set() });
      const entry = totals.get(key);
      entry.quantity += quantity;
      entry.revenue += revenue;
      entry.orders.add(orderId);
    }
  }
  return {
    rows,
    products: [...totals.values()].map(({ orders: ids, ...p }) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100, orderCount: ids.size }))
      .sort((a, b) => b.revenue - a.revenue)
  };
}
export const formatReportQuantity = (quantity, unit) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(quantity) + ' ' + unit;
