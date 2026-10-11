import test from 'node:test';
import assert from 'node:assert/strict';
import {brazilDayKey} from '../lib/whatsappMarketingGuard.js';
import {MANUAL_MARKETING_BATCH_SIZE,MANUAL_MARKETING_DAILY_LIMIT,marketingAttemptHash,selectRemainingMarketingRecipients} from '../lib/marketingBatchSelection.js';

test('batch size remains 20, manual daily cap is disabled',async ()=>{
  assert.equal(MANUAL_MARKETING_BATCH_SIZE,20);
  assert.equal(MANUAL_MARKETING_DAILY_LIMIT,null);
  const phones=Array.from({length:50},(_,i)=>'519'+String(i).padStart(8,'0'));
  const first=await selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,maxRecipients:20,attemptedToday:0});
  assert.equal(first.recipients.length,20);
  assert.equal(first.remainingToday,null);
  const day=brazilDayKey();
  const attempts=first.recipients.map(p=>`csi_${day}_${marketingAttemptHash('csi',p)}`);
  const second=await selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,maxRecipients:20,attemptedToday:20,attemptedDocumentIds:attempts});
  assert.equal(second.recipients.length,20);
  assert.equal(second.recipients[0],phones[20]);
  assert.equal(second.remainingToday,null);
});
test('daily cap, deduplication, and unrelated attempts do not bypass recipient controls',async ()=>{
  const phones=['51988888888','51999999999','51977777777'];
  const day=brazilDayKey();
  const attempts=[`csi_${day}_${marketingAttemptHash('csi',phones[0])}`,'other_2026-10-09_dummy'];
  assert.deepEqual(await selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,attemptedDocumentIds:attempts,attemptedToday:199,maxRecipients:20,dailyLimit:200}).recipients,[phones[1]]);
  assert.equal(await selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,attemptedDocumentIds:attempts,attemptedToday:200,maxRecipients:20,dailyLimit:200}).recipients.length,0);
});

test('200-document API preview is augmented with all remaining paginated attempts', async ()=>{
  const day=brazilDayKey(), storeId='csi';
  const phones=Array.from({length:310},(_,i)=>'519'+String(i).padStart(8,'0'));
  const ids=phones.map(phone=>`${storeId}_${day}_${marketingAttemptHash(storeId,phone)}`).sort();
  const scanned=ids.slice(0,200);
  let readCount=0;
  const result=await selectRemainingMarketingRecipients({
    storeId,eligiblePhones:phones,maxRecipients:20,attemptedToday:309,
    attemptedDocumentIds:scanned,
    fetchAttemptPage:async (cursor)=>{
      readCount++;
      return ids.filter(x=>x>cursor).slice(0,1000);
    }
  });
  // All 310 recipients were attempted, so neither preview nor send retries a number.
  assert.equal(result.recipients.length,0);
  assert.equal(readCount,1);
  assert.equal(result.remainingToday,null);
});
