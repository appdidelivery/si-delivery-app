import crypto from 'node:crypto';

// Marketing requires a recorded affirmative choice, not merely an inbound chat.
export function hasMarketingOptIn(source = {}) {
  if (source.whatsappMarketingOptOut === true || source.marketingOptOut === true) return false;
  return source.whatsappMarketingOptIn === true || source.marketingOptIn === true;
}

// Lojas de bebidas devem registrar maioridade antes de campanhas promocionais.
export function hasEligibleMarketingConsent(source = {}, requireAdult = false) {
  if (!hasMarketingOptIn(source)) return false;
  if (!requireAdult) return true;
  return source.alcoholMarketingAgeConfirmed === true ||
    source.customer?.alcoholMarketingAgeConfirmed === true;
}

export function normalizeMarketingPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits.length === 11 ? digits : null;
}

export function getLifecycleStage(daysInactive) {
  const days = Number(daysInactive);
  if (!Number.isFinite(days) || days < 30) return null;
  if (days >= 90) return 90;
  if (days >= 60) return 60;
  return 30;
}

export function brazilDayKey(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Marketing unsubscribe does not block ordinary order/customer-service messages.
export async function isMarketingOptedOut(db, storeId, phone) {
  const normalized = normalizeMarketingPhone(phone);
  if (!normalized) return true;
  const record = await db.collection('whatsapp_marketing_optouts').doc(`${storeId}_${normalized}`).get();
  return record.exists;
}

// Atomic attempt tracking and per-contact daily deduplication.
// Automated journeys retain their daily cap. For manual opted-in campaigns,
// dailyLimit:null removes ONLY the internal daily cap, not Meta's limits.
export async function reserveMarketingAttempt(db, { storeId, phone, type = 'marketing', dailyLimit = 20 }) {
  const normalized = normalizeMarketingPhone(phone);
  if (!storeId || !normalized) return { allowed: false, reason: 'invalid_recipient' };

  const day = brazilDayKey();
  // Automation callers still pass a limit of 20. Manual opt-in campaigns may request up to 200 per day.
  const hasDailyCap = dailyLimit !== null;
  const maxAttempts = hasDailyCap ? Math.max(1, Math.min(200, Number(dailyLimit) || 20)) : null;
  const phoneHash = crypto.createHash('sha256').update(`${storeId}:${normalized}`).digest('hex');
  const usageRef = db.collection('whatsapp_marketing_daily_usage').doc(`${storeId}_${day}`);
  const attemptRef = db.collection('whatsapp_marketing_attempts').doc(`${storeId}_${day}_${phoneHash}`);

  return db.runTransaction(async tx => {
    const [usageSnap, attemptSnap] = await Promise.all([tx.get(usageRef), tx.get(attemptRef)]);
    if (attemptSnap.exists) return { allowed: false, reason: 'already_attempted_today' };

    const count = Number(usageSnap.data()?.attempted || 0);
    if (hasDailyCap && count >= maxAttempts) return { allowed: false, reason: 'daily_limit_reached' };

    tx.set(usageRef, { storeId, day, attempted: count + 1, dailyLimit: maxAttempts }, { merge: true });
    tx.set(attemptRef, { storeId, day, phoneHash, type, attemptedAt: new Date() });
    return { allowed: true, remaining: hasDailyCap ? maxAttempts - count - 1 : null };
  });
}
