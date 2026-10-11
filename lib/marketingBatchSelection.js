import crypto from 'node:crypto';
import { brazilDayKey } from './whatsappMarketingGuard.js';

// A batch controls the size of ONE click, not the entire business day.
// Only already opted-in and otherwise eligible phones should enter this function.
export const MANUAL_MARKETING_BATCH_SIZE=20;
// null removes the local daily cap for manual, consented campaigns; Meta limits still apply.
export const MANUAL_MARKETING_DAILY_LIMIT=null;

export function marketingAttemptHash(storeId,phone){
  return crypto.createHash('sha256').update(`${storeId}:${phone}`).digest('hex');
}

export async function selectRemainingMarketingRecipients({storeId,eligiblePhones,attemptedDocumentIds=[],maxRecipients=20,attemptedToday=0,dailyLimit=MANUAL_MARKETING_DAILY_LIMIT,fetchAttemptPage=null}={}){
  // api/index.js reads the first 200 hashes for its preview; fetch remaining pages
  // here when necessary, so attempts >200 never cause the same blocked batch to recur.
  const allIds = [...attemptedDocumentIds];
  if (attemptedDocumentIds.length >= 200) {
    const dayPrefix = `${storeId}_${brazilDayKey()}_`;
    const readPage = fetchAttemptPage || (async (cursor) => {
      const {default: admin} = await import('firebase-admin');
      if (!admin.apps?.length) throw new Error('Firebase Admin not initialized');
      const snapshot = await admin.firestore().collection('whatsapp_marketing_attempts')
        .where(admin.firestore.FieldPath.documentId(), '>=', dayPrefix)
        .where(admin.firestore.FieldPath.documentId(), '<=', `${dayPrefix}\uf8ff`)
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAfter(cursor)
        .limit(1000).get();
      return snapshot.docs.map(doc => doc.id);
    });
    let cursor = attemptedDocumentIds[attemptedDocumentIds.length - 1];
    for (;;) {
      const next = await readPage(cursor);
      if (!Array.isArray(next)) throw new Error('Invalid attempt page');
      if (!next.length) break;
      for (const id of next) {
        if (!String(id).startsWith(dayPrefix) || String(id) <= String(cursor)) throw new Error('Invalid attempt pagination');
        allIds.push(id);
      }
      cursor = next[next.length - 1];
      if (next.length < 1000) break;
    }
  }
  const count=Math.max(1,Math.min(MANUAL_MARKETING_BATCH_SIZE,Number(maxRecipients)||1));
  const hasDailyCap=dailyLimit !== null && Number.isFinite(Number(dailyLimit)) && Number(dailyLimit)>0;
  const capacity=hasDailyCap ? Math.max(0,Math.floor(Number(dailyLimit))-Math.max(0,Number(attemptedToday)||0)) : Infinity;
  const today=brazilDayKey();
  const prefix=`${storeId}_${today}_`;
  const hashes=new Set(allIds.map(id=>String(id).startsWith(prefix)?String(id).slice(prefix.length):''));
  const unattempted=eligiblePhones.filter(phone=>!hashes.has(marketingAttemptHash(storeId,phone)));
  return {recipients:unattempted.slice(0,Math.min(count,capacity)),nextBatchAvailable:Math.min(unattempted.length,capacity),remainingToday:hasDailyCap ? capacity : null,alreadyAttemptedToday:Math.max(0,Number(attemptedToday)||0)};
}
