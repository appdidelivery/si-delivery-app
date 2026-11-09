import { hasValidCsiMarketingRecord } from './whatsappConsentCapture.js';
import { normalizeMarketingPhone } from './whatsappMarketingGuard.js';

// For read-only reconciliation, keep the exact national number as an identity.
// The existing normalizer may insert a ninth digit: that match is only a
// possible format discrepancy for manual review, NEVER automatic attribution.
export function csiAuditPhoneIdentity(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && !digits.startsWith('55')) return null;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (!/^[1-9][0-9][0-9]{8,9}$/.test(digits)) return null;
  const comparison = normalizeMarketingPhone(digits);
  return comparison ? { exact: digits, comparison } : null;
}

const excludedStatuses = new Set(['canceled', 'cancelado', 'cancelled', 'refunded', 'estornado']);

export function analyzeCsiConsentReconciliation({
  orders = [], consents = [], carts = [], blocked = [], optouts = [],
  partial = {}, scanned = {}
} = {}) {
  const valid = new Map();
  let invalidOrDuplicated = 0;
  for (const consent of consents) {
    if (!hasValidCsiMarketingRecord(consent)) continue;
    const phone = csiAuditPhoneIdentity(consent.phone);
    if (!phone) { invalidOrDuplicated++; continue; }
    // Keys identify a potential formatting collision, not authorization to send.
    if (valid.has(phone.exact)) { invalidOrDuplicated++; continue; }
    valid.set(phone.exact, phone);
  }
  const exactOrders = new Set(), comparisonOrders = new Set();
  const exactCompleted = new Set(), comparisonCompleted = new Set();
  const orderPhones = { missingOrInvalid:0, nestedOnly:0, conflictingFields:0, valid:0 };
  let canceledOrRefunded = 0;
  for (const order of orders) {
    const primary = csiAuditPhoneIdentity(order.customerPhone);
    const nested = csiAuditPhoneIdentity(order.customer?.phone);
    if (primary && nested && primary.exact !== nested.exact) {
      // Even a ninth-digit variation across fields needs investigation.
      orderPhones.conflictingFields++;
      continue;
    }
    const phone = primary || nested;
    if (!phone) { orderPhones.missingOrInvalid++; continue; }
    if (!primary && nested) orderPhones.nestedOnly++;
    orderPhones.valid++;
    exactOrders.add(phone.exact);
    comparisonOrders.add(phone.comparison);
    const status = String(order.status || '').toLowerCase();
    if (excludedStatuses.has(status)) { canceledOrRefunded++; continue; }
    if (status === 'completed') {
      exactCompleted.add(phone.exact);
      comparisonCompleted.add(phone.comparison);
    }
  }
  const exactCarts = new Set(), comparisonCarts = new Set();
  for (const cart of carts) {
    const phone = csiAuditPhoneIdentity(cart.customerPhone);
    if (!phone) continue;
    exactCarts.add(phone.exact);
    comparisonCarts.add(phone.comparison);
  }
  const exclusions = new Set([...blocked,...optouts]
    .map(record => csiAuditPhoneIdentity(record.phone)?.comparison).filter(Boolean));
  const coverage = {
    exactOrderMatch:0, formatOnlyOrderMatch:0,
    cartOnlyExact:0, cartOnlyFormatReview:0, noOrderOrCartInScan:0,
    completedOrderExact:0, completedOrderFormatReview:0,
    optedOutOrBlocked:0
  };
  for (const phone of valid.values()) {
    if (exclusions.has(phone.comparison)) coverage.optedOutOrBlocked++;
    if (exactCompleted.has(phone.exact)) coverage.completedOrderExact++;
    else if (comparisonCompleted.has(phone.comparison)) coverage.completedOrderFormatReview++;

    if (exactOrders.has(phone.exact)) coverage.exactOrderMatch++;
    else if (comparisonOrders.has(phone.comparison)) coverage.formatOnlyOrderMatch++;
    else if (exactCarts.has(phone.exact)) coverage.cartOnlyExact++;
    else if (comparisonCarts.has(phone.comparison)) coverage.cartOnlyFormatReview++;
    else coverage.noOrderOrCartInScan++;
  }
  const counts = {
    consentRecordsScanned:consents.length, validDistinctConsentPhones:valid.size,
    invalidOrDuplicatedConsentPhones:invalidOrDuplicated,
    orderPhoneQuality:orderPhones, canceledOrRefundedOrders:canceledOrRefunded,
    coverage, scanned, partial,
    note:'Somente conciliação informativa. Correspondência com nono dígito diferente exige revisão; nenhuma mensagem enviada e nenhuma autorização transferida.'
  };
  return counts;
}
