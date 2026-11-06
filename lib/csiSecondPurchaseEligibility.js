import { normalizeMarketingPhone } from './whatsappMarketingGuard.js';

const MS_PER_DAY = 86400000;
const canceled = new Set(['canceled', 'cancelled', 'cancelado', 'refunded', 'estornado']);
const milliseconds = value => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export function secondPurchasePolicy(config = {}) {
  const days = Number(config.secondPurchaseAfterDays);
  const max = Number(config.secondPurchaseMaxAgeDays);
  return {
    afterDays: Number.isInteger(days) && days >= 7 && days <= 30 ? days : 7,
    maxAgeDays: Number.isInteger(max) && max >= 8 && max <= 60 ? max : 30,
  };
}

// Read-only eligibility; this never infers permission from a purchase.
// Consent, majority, blocked contacts and opt-outs are rechecked by the queue.
export function evaluateCsiSecondPurchase({
  sourceId, order = {}, otherOrders = [], nowMs = Date.now(),
  afterDays = 7, maxAgeDays = 30,
} = {}) {
  if (order.storeId !== 'csi' || String(order.status || '').toLowerCase() !== 'completed') {
    return { allowed: false, reason: 'not_completed' };
  }
  if (order.journeySecondPurchaseSent === true) {
    return { allowed: false, reason: 'already_sent' };
  }
  const phone = normalizeMarketingPhone(order.customerPhone || order.customer?.phone);
  const completedAtMs = milliseconds(order.completedAt || order.updatedAt || order.createdAt);
  if (!sourceId || !phone || !completedAtMs) return { allowed: false, reason: 'missing_data' };

  const elapsedMs = nowMs - completedAtMs;
  if (elapsedMs < afterDays * MS_PER_DAY) {
    return { allowed: false, reason: 'not_due', remainingMs: afterDays * MS_PER_DAY - elapsedMs };
  }
  if (elapsedMs > maxAgeDays * MS_PER_DAY) {
    return { allowed: false, reason: 'expired' };
  }

  // Skip if this customer already placed another order, even if it is still
  // pending completion. Never send an incentive for a second purchase already made.
  const repeatedPurchase = otherOrders.some(item => {
    if (!item || item.id === sourceId || item.storeId !== 'csi') return false;
    if (canceled.has(String(item.status || '').toLowerCase())) return false;
    return normalizeMarketingPhone(item.customerPhone || item.customer?.phone) === phone;
  });
  if (repeatedPurchase) return { allowed: false, reason: 'already_reordered' };
  return { allowed: true, phone };
}
