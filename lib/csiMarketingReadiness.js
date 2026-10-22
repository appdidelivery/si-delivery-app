import crypto from 'node:crypto';
import { normalizeMarketingPhone, getLifecycleStage } from './whatsappMarketingGuard.js';
import { hasAuthorizedCsiMarketingConsent } from './csiMarketingEligibility.js';
import { hasValidCsiMarketingRecord } from './whatsappConsentCapture.js';

const millis = value => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const v = new Date(value).getTime();
  return Number.isFinite(v) ? v : 0;
};
const blockedStatus = new Set(['canceled','cancelado','cancelled','refunded','estornado']);

export function analyzeCsiMarketingReadiness({
  carts = [], orders = [], consents = [], blocked = [], optouts = [],
  lifecycle = [], nowMs = Date.now(), secondPurchaseAfterDays = 7,
  secondPurchaseMaxAgeDays = 30
} = {}) {
  const blockedPhones = new Set([...blocked, ...optouts].map(x =>
    normalizeMarketingPhone(x.phone)).filter(Boolean));
  const validConsents = new Map(consents.map(x =>
    [normalizeMarketingPhone(x.phone), x]).filter(([phone, x]) =>
    phone && hasValidCsiMarketingRecord(x)));
  const recipientState = (data, phone) => {
    if (!phone) return 'missingPhone';
    if (blockedPhones.has(phone) || data?.whatsappMarketingOptOut === true ||
        data?.marketingOptOut === true) return 'blocked';
    if (!hasAuthorizedCsiMarketingConsent(data, validConsents.get(phone))) return 'missingConsentOrAdult';
    return 'eligible';
  };
  const fresh = () => ({
    eligibleNow: 0, missingPhone: 0, blocked: 0, missingConsentOrAdult: 0,
    notDue: 0, alreadySent: 0, examined: 0
  });
  const abandoned = fresh(), postSale = fresh(), secondPurchase = fresh(), retention = fresh();
  for (const cart of carts) {
    if (cart.status !== 'abandoned') continue;
    abandoned.examined++;
    if (cart.journeyAbandonedSent === true || cart.abandonmentAlertSent === true) {
      abandoned.alreadySent++; continue;
    }
    const at = millis(cart.lastUpdated);
    if (!at || nowMs - at < 30 * 60000) { abandoned.notDue++; continue; }
    const phone = normalizeMarketingPhone(cart.customerPhone);
    abandoned[recipientState(cart,phone)==='eligible'?'eligibleNow':recipientState(cart,phone)]++;
  }
  const completedByPhone = new Map();
  const latestByPhone = new Map();
  for (const order of orders) {
    if (blockedStatus.has(String(order.status||'').toLowerCase())) continue;
    const phone = normalizeMarketingPhone(order.customerPhone || order.customer?.phone);
    const at = millis(order.createdAt || order.paidAt || order.completedAt);
    if (phone && at && (!latestByPhone.has(phone) || at > latestByPhone.get(phone).at)) {
      latestByPhone.set(phone, { data:order, at, phone });
    }
    if (String(order.status||'').toLowerCase() !== 'completed') continue;
    const doneAt = millis(order.completedAt || order.updatedAt || order.createdAt || order.paidAt);
    if (!phone || !doneAt) continue;
    if (!completedByPhone.has(phone)) completedByPhone.set(phone, []);
    completedByPhone.get(phone).push({ data: order, at:doneAt, phone });
    if (nowMs - doneAt < 30*60000 || nowMs - doneAt > 48*3600000) continue;
    postSale.examined++;
    if (order.journeyPostSaleSent === true) { postSale.alreadySent++; continue; }
    const reason = recipientState(order,phone);
    postSale[reason==='eligible'?'eligibleNow':reason]++;
  }
  for (const [phone, list] of completedByPhone) {
    if (list.length !== 1) continue;
    const item = list[0], days = (nowMs - item.at)/86400000;
    if (days < secondPurchaseAfterDays || days > secondPurchaseMaxAgeDays) continue;
    secondPurchase.examined++;
    if (item.data.journeySecondPurchaseSent === true) { secondPurchase.alreadySent++; continue; }
    const reason = recipientState(item.data,phone);
    secondPurchase[reason==='eligible'?'eligibleNow':reason]++;
  }
  const previousByHash = new Map(lifecycle.map(x => [x.id,x]));
  for (const [phone, entry] of latestByPhone) {
    const ageDays = Math.floor((nowMs - entry.at)/86400000);
    if (ageDays < 30) continue;
    retention.examined++;
    const hash = crypto.createHash('sha256').update('csi:'+phone).digest('hex');
    const previous = previousByHash.get(hash)||{};
    const newCycle = entry.at > (Number(previous.lastOrderAtMs)||0);
    const stage = getLifecycleStage(ageDays);
    const lastStage = newCycle?0:Number(previous.lastStageSent)||0;
    const lastAt = newCycle?0:millis(previous.lastSentAt);
    if (stage <= lastStage || (lastAt && nowMs-lastAt < 7*86400000)) {
      retention.alreadySent++; continue;
    }
    const reason = recipientState(entry.data,phone);
    retention[reason==='eligible'?'eligibleNow':reason]++;
  }
  return {
    abandoned, postSale, secondPurchase, retention,
    validWhatsAppConsents:validConsents.size, blockedOrOptoutPhones:blockedPhones.size,
    scanned: { carts:carts.length, orders:orders.length, consents:consents.length,
      blocked:blocked.length, optouts:optouts.length, lifecycle:lifecycle.length },
    note:'Contagens estimadas da amostra, antes da janela de cron, abertura da loja e limites diários. Nenhuma mensagem enviada.'
  };
}
