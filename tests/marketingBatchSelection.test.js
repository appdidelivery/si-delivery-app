import test from 'node:test';
import assert from 'node:assert/strict';
import {brazilDayKey} from '../lib/whatsappMarketingGuard.js';
import {MANUAL_MARKETING_BATCH_SIZE,MANUAL_MARKETING_DAILY_LIMIT,marketingAttemptHash,selectRemainingMarketingRecipients} from '../lib/marketingBatchSelection.js';

test('batch size is 20, daily manual capacity is distinct 200',()=>{
  assert.equal(MANUAL_MARKETING_BATCH_SIZE,20);
  assert.equal(MANUAL_MARKETING_DAILY_LIMIT,200);
  const phones=Array.from({length:50},(_,i)=>'519'+String(i).padStart(8,'0'));
  const first=selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,maxRecipients:20,attemptedToday:0});
  assert.equal(first.recipients.length,20);
  assert.equal(first.remainingToday,200);
  const day=brazilDayKey();
  const attempts=first.recipients.map(p=>`csi_${day}_${marketingAttemptHash('csi',p)}`);
  const second=selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,maxRecipients:20,attemptedToday:20,attemptedDocumentIds:attempts});
  assert.equal(second.recipients.length,20);
  assert.equal(second.recipients[0],phones[20]);
  assert.equal(second.remainingToday,180);
});
test('daily cap, deduplication, and unrelated attempts do not bypass recipient controls',()=>{
  const phones=['51988888888','51999999999','51977777777'];
  const day=brazilDayKey();
  const attempts=[`csi_${day}_${marketingAttemptHash('csi',phones[0])}`,'other_2026-10-09_dummy'];
  assert.deepEqual(selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,attemptedDocumentIds:attempts,attemptedToday:199,maxRecipients:20}).recipients,[phones[1]]);
  assert.equal(selectRemainingMarketingRecipients({storeId:'csi',eligiblePhones:phones,attemptedDocumentIds:attempts,attemptedToday:200,maxRecipients:20}).recipients.length,0);
});
