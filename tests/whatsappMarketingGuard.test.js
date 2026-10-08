import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMarketingOptIn, hasEligibleMarketingConsent, normalizeMarketingPhone, brazilDayKey, getLifecycleStage, reserveMarketingAttempt } from '../lib/whatsappMarketingGuard.js';

test('inbound interaction alone is not marketing consent', () => {
  assert.equal(hasMarketingOptIn({ hasInboundChat: true }), false);
  assert.equal(hasMarketingOptIn({ whatsappMarketingOptIn: true }), true);
  assert.equal(hasMarketingOptIn({ marketingOptIn: true, marketingOptOut: true }), false);
});

test('beverage marketing requires both opt-in and adult confirmation', () => {
  assert.equal(hasEligibleMarketingConsent({whatsappMarketingOptIn:true},true),false);
  assert.equal(hasEligibleMarketingConsent({whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true},true),true);
  assert.equal(hasEligibleMarketingConsent({whatsappMarketingOptIn:false,alcoholMarketingAgeConfirmed:true},true),false);
  assert.equal(hasEligibleMarketingConsent({whatsappMarketingOptIn:true},false),true);
});

test('30/60/90 lifecycle boundaries', () => {
  for (const [days, stage] of [[0, null], [29, null], [30, 30], [59, 30], [60, 60], [89, 60], [90, 90], [120, 90]]) {
    assert.equal(getLifecycleStage(days), stage);
  }
});

test('phone normalization is consistent', () => {
  assert.equal(normalizeMarketingPhone('+55 (51) 99999-9999'), '51999999999');
  assert.equal(normalizeMarketingPhone('51999999999'), '51999999999');
  assert.equal(normalizeMarketingPhone('123'), null);
});

test('date formatting uses São Paulo day', () => {
  assert.equal(brazilDayKey(new Date('2026-10-09T02:00:00Z')), '2026-10-08');
});

test('atomic quota blocks duplicate recipient and limits attempts', async () => {
  const records = new Map();
  const mockDb = {
    collection(name) {
      return { doc(id) { return { key: name + '/' + id }; } };
    },
    async runTransaction(callback) {
      const tx = {
        async get(ref) { const data = records.get(ref.key); return { exists: !!data, data: () => data }; },
        set(ref, data, options = {}) {
          records.set(ref.key, options.merge ? { ...records.get(ref.key), ...data } : data);
        }
      };
      return callback(tx);
    }
  };
  assert.equal((await reserveMarketingAttempt(mockDb,{storeId:'csi',phone:'51999999999',dailyLimit:1})).allowed, true);
  assert.equal((await reserveMarketingAttempt(mockDb,{storeId:'csi',phone:'51999999999',dailyLimit:1})).reason, 'already_attempted_today');
  assert.equal((await reserveMarketingAttempt(mockDb,{storeId:'csi',phone:'51888888888',dailyLimit:1})).reason, 'daily_limit_reached');
});
