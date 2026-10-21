import test from 'node:test';
import assert from 'node:assert/strict';
import { getGoogleTrackingConfig, isGooglePurchaseEligible, trackGooglePurchase } from '../src/utils/googlePurchase.js';

test('reads and validates the store measurement and ad destinations', () => {
  assert.deepEqual(getGoogleTrackingConfig({ ga4: { frontendMeasurementId: 'G-3MZRMRQ8XJ' }, gads: { conversionId: 'AW-12345', conversionLabel: 'Label_1' } }, {}), {
    ga4Id: 'G-3MZRMRQ8XJ', adsId: 'AW-12345', conversionLabel: 'Label_1',
  });
  assert.equal(getGoogleTrackingConfig({ ga4: { frontendMeasurementId: '12345' } }, {}).ga4Id, '');
});

test('does not count pending online, failed, cancelled or waiter orders as purchases', () => {
  const base = { id: 'order', storeId: 'store', paymentStatus: 'pending', status: 'pending' };
  assert.equal(isGooglePurchaseEligible(base), false);
  assert.equal(isGooglePurchaseEligible({ ...base, paymentStatus: 'failed' }), false);
  assert.equal(isGooglePurchaseEligible({ ...base, paymentStatus: 'paid', status: 'canceled' }), false);
  assert.equal(isGooglePurchaseEligible({ ...base, paymentStatus: 'paid', orderType: 'garcom' }), false);
  assert.equal(isGooglePurchaseEligible({ ...base, paymentStatus: 'paid' }), true);
  assert.equal(isGooglePurchaseEligible({ ...base, paymentStatus: 'pending_on_delivery' }), true);
});

test('emits each confirmed purchase once and explicitly targets the correct GA4 and Google Ads IDs', () => {
  const calls = [];
  const nodes = new Map([['google-gtag-script', {}]]);
  globalThis.window = {
    dataLayer: [],
    gtag(...args) { calls.push(args); },
  };
  globalThis.document = {
    getElementById(id) { return nodes.get(id) || null; },
    createElement() { return {}; },
    head: { appendChild() { throw new Error('Existing script should be reused'); } },
  };
  const saved = new Map();
  globalThis.localStorage = {
    getItem(key) { return saved.get(key) || null; },
    setItem(key, value) { saved.set(key, value); },
  };
  const order = {
    id: 'order-confirmed-unique', storeId: 'santa-isabel', paymentStatus: 'paid', status: 'preparing',
    total: 38.5, items: [{ id: 'p1', name: 'Produto', price: 19.25, quantity: 2 }],
    googleTracking: { ga4Id: 'G-3MZRMRQ8XJ', adsId: 'AW-12345', conversionLabel: 'Label_1' },
  };
  assert.equal(trackGooglePurchase(order), true);
  assert.equal(trackGooglePurchase(order), false);
  const events = calls.filter(x => x[0] === 'event');
  assert.equal(events.length, 2);
  assert.equal(events[0][1], 'purchase');
  assert.equal(events[0][2].send_to, 'G-3MZRMRQ8XJ');
  assert.equal(events[0][2].transaction_id, 'order-confirmed-unique');
  assert.equal(events[1][1], 'conversion');
  assert.equal(events[1][2].send_to, 'AW-12345/Label_1');
});

test('never throws when the Google script is blocked', () => {
  globalThis.window = { dataLayer: [] };
  globalThis.document = {
    getElementById() { return null; },
    createElement() { return {}; },
    head: { appendChild() { throw new Error('blocked'); } },
  };
  globalThis.localStorage = { getItem() { return null; }, setItem() {} };
  assert.equal(trackGooglePurchase({
    id: 'blocked-order', storeId: 'shop', paymentStatus: 'paid',
    googleTracking: { ga4Id: 'G-3MZRMRQ8XJ' },
  }), false);
});
