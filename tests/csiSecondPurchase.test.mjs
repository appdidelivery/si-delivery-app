import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { secondPurchasePolicy, evaluateCsiSecondPurchase } from '../lib/csiSecondPurchaseEligibility.js';

const now = Date.parse('2026-11-06T12:00:00Z');
const phone = '48988722970';
const first = {
  id: 'purchase-1', storeId: 'csi', status: 'completed', customerPhone: phone,
  createdAt: new Date(now - 10 * 86400000), completedAt: new Date(now - 10 * 86400000),
};
const evaluate = (patch = {}, otherOrders = [], options = {}) => evaluateCsiSecondPurchase({
  sourceId: 'purchase-1', order: {...first,...patch}, otherOrders, nowMs: now, ...options,
});

test('seven-day rule, window and first purchase only', () => {
  assert.equal(evaluate().allowed, true);
  assert.equal(evaluate({completedAt: new Date(now - 2*86400000)}).reason,'not_due');
  assert.equal(evaluate({completedAt: new Date(now - 35*86400000)}).reason,'expired');
  assert.equal(evaluate({status:'pending'}).reason,'not_completed');
  assert.equal(evaluate({journeySecondPurchaseSent:true}).reason,'already_sent');
  assert.equal(evaluate({customerPhone:''}).reason,'missing_data');
  assert.equal(evaluate({storeId:'other'}).reason,'not_completed');
});

test('second purchase pending or completed prevents incentive, canceled does not',()=>{
  const newOrder={id:'purchase-2',storeId:'csi',status:'pending',customerPhone:'+55 (48) 98872-2970'};
  assert.equal(evaluate({},[newOrder]).reason,'already_reordered');
  assert.equal(evaluate({},[{...newOrder,status:'completed'}]).reason,'already_reordered');
  assert.equal(evaluate({},[{...newOrder,status:'canceled'}]).allowed,true);
  assert.equal(evaluate({},[{...newOrder,customerPhone:'48999999999'}]).allowed,true);
});

test('the queue schedules without retroactive broadcast and revalidates consent',()=>{
  const code=readFileSync(new URL('../server/journeyQueue.js',import.meta.url),'utf8');
  assert.match(code,/if \(message\.type === 'second_purchase'\)/);
  assert.match(code,/evaluateCsiSecondPurchase\(/);
  assert.match(code,/canReceiveJourneyMarketing\(decision\.phone, order\)/);
  assert.match(code,/isMarketingOptedOut\(db, CSI_STORE_ID, normalized\)/);
  assert.match(code,/templateCandidates: \['velo_segunda_compra_bebidas'\]/);
  assert.match(code,/journeySecondPurchaseSent: true/);
  assert.match(code,/type: 'second_purchase', storeId, sourceId: String\(sourceId\)/);
  assert.match(code,/idempotencyKey: `csi:second-purchase:/);
  assert.match(code,/const safePhone = normalizeWhatsAppReplyRecipient\(phone\)/);
  assert.doesNotMatch(code,/const safePhone = `55\$\{normalized\}`/);
  assert.match(code,/Math\.min\(6 \* 86400/);
});

test('settings do not allow immediate or excessive second-purchase messaging',()=>{
  assert.deepEqual(secondPurchasePolicy({}),{afterDays:7,maxAgeDays:30});
  assert.deepEqual(secondPurchasePolicy({secondPurchaseAfterDays:1,secondPurchaseMaxAgeDays:999}),{afterDays:7,maxAgeDays:30});
  assert.deepEqual(secondPurchasePolicy({secondPurchaseAfterDays:14,secondPurchaseMaxAgeDays:40}),{afterDays:14,maxAgeDays:40});
});
