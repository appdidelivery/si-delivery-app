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

export function selectRemainingMarketingRecipients({storeId,eligiblePhones,attemptedDocumentIds=[],maxRecipients=20,attemptedToday=0,dailyLimit=MANUAL_MARKETING_DAILY_LIMIT}={}){
  const count=Math.max(1,Math.min(MANUAL_MARKETING_BATCH_SIZE,Number(maxRecipients)||1));
  const hasDailyCap=dailyLimit !== null && Number.isFinite(Number(dailyLimit)) && Number(dailyLimit)>0;
  const capacity=hasDailyCap ? Math.max(0,Math.floor(Number(dailyLimit))-Math.max(0,Number(attemptedToday)||0)) : Infinity;
  const today=brazilDayKey();
  const prefix=`${storeId}_${today}_`;
  const hashes=new Set(attemptedDocumentIds.map(id=>String(id).startsWith(prefix)?String(id).slice(prefix.length):''));
  const unattempted=eligiblePhones.filter(phone=>!hashes.has(marketingAttemptHash(storeId,phone)));
  return {recipients:unattempted.slice(0,Math.min(count,capacity)),nextBatchAvailable:Math.min(unattempted.length,capacity),remainingToday:hasDailyCap ? capacity : null,alreadyAttemptedToday:Math.max(0,Number(attemptedToday)||0)};
}
