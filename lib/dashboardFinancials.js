// Cálculos financeiros independentes da lista operacional (limitada a 800 pedidos).
export const FINANCIAL_PERIOD_DAYS = [7, 30, 180, 365];
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

const CANCELED_ORDER_STATUSES = new Set([
  'canceled', 'cancelled', 'cancelado', 'cancelada', 'void', 'voided',
  'refunded', 'estornado', 'chargeback', 'rejected', 'failed'
]);
const CANCELED_PAYMENT_STATUSES = new Set([
  'canceled', 'cancelled', 'cancelado', 'cancelada', 'refunded',
  'estornado', 'chargeback', 'rejected', 'failed'
]);
const AWAITING_PAYMENT_ORDER_STATUSES = new Set([
  'pending_payment', 'awaiting_payment', 'aguardando_pagamento'
]);
const AWAITING_PAYMENT_STATUSES = new Set([
  'pending', 'pendente', 'unpaid', 'waiting', 'awaiting_payment',
  'pending_payment', 'in_process', 'processing'
]);
const ONLINE_PAYMENT_METHODS = new Set([
  'pix', 'stripe', 'online', 'link_mp', 'mercadopago_link', 'mercado_pago',
  'mp_transparent', 'velopay_pix', 'velopay_credit'
]);

export function toOrderMillis(value) {
  if (!value) return NaN;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function toFinancialNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string' || !value.trim()) return 0;
  const text = value.replace(/[R$\s]/g, '');
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

// Somente pedidos financeiros válidos; pagamento offline não exige status "paid".
export function countsAsSale(order) {
  const status = String(order?.status || '').trim().toLowerCase();
  const paymentStatus = String(order?.paymentStatus || '').trim().toLowerCase();
  const paymentMethod = String(order?.paymentMethod || '').trim().toLowerCase();
  if (CANCELED_ORDER_STATUSES.has(status) || CANCELED_PAYMENT_STATUSES.has(paymentStatus)) return false;
  if (AWAITING_PAYMENT_ORDER_STATUSES.has(status)) return false;
  if (ONLINE_PAYMENT_METHODS.has(paymentMethod) && AWAITING_PAYMENT_STATUSES.has(paymentStatus)) return false;
  return true;
}

export function summarizeFinancialHistory(orders = [], nowMs = Date.now()) {
  const periods = Object.fromEntries(FINANCIAL_PERIOD_DAYS.map(days => [
    String(days), { revenue: 0, profit: 0, orderCount: 0, pricedItemCount: 0, itemsMissingCost: 0 }
  ]));
  const cents = Object.fromEntries(FINANCIAL_PERIOD_DAYS.map(days => [String(days), { revenue: 0, profit: 0 }]));

  for (const order of orders) {
    const createdMs = toOrderMillis(order?.createdAt);
    if (!Number.isFinite(createdMs) || createdMs > nowMs || !countsAsSale(order)) continue;
    const age = nowMs - createdMs;
    if (age > 365 * DAY_IN_MS) continue;

    const totalCents = Math.round(toFinancialNumber(order?.total) * 100);
    let marginCents = 0, pricedItemCount = 0, itemsMissingCost = 0;
    for (const item of Array.isArray(order?.items) ? order.items : []) {
      if (!item) continue;
      const qty = toFinancialNumber(item.quantity ?? item.qty);
      if (qty <= 0) continue;
      if (item.costPrice === null || item.costPrice === undefined || item.costPrice === '') {
        itemsMissingCost += 1;
        continue;
      }
      pricedItemCount += 1;
      const price = toFinancialNumber(item.price ?? item.unitPrice);
      const cost = toFinancialNumber(item.costPrice);
      marginCents += Math.round((price - cost) * qty * 100);
    }

    for (const days of FINANCIAL_PERIOD_DAYS) {
      if (age > days * DAY_IN_MS) continue;
      const key = String(days);
      cents[key].revenue += totalCents;
      cents[key].profit += marginCents;
      periods[key].orderCount += 1;
      periods[key].pricedItemCount += pricedItemCount;
      periods[key].itemsMissingCost += itemsMissingCost;
    }
  }

  for (const days of FINANCIAL_PERIOD_DAYS) {
    const key = String(days);
    periods[key].revenue = cents[key].revenue / 100;
    periods[key].profit = cents[key].profit / 100;
  }
  return periods;
}
