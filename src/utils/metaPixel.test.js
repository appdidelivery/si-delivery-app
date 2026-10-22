import test from 'node:test';
import assert from 'node:assert/strict';
import { initMetaPixel, trackMetaEvent, trackMetaPurchase, isOriginalBuyerForMetaPurchase } from './metaPixel.js';

test('Pixel enfileira eventos por loja, rejeita IDs inválidos e deduplica compra', t => {
  const scripts = [];
  for (const key of ['window', 'document', 'localStorage']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: undefined });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  t.mock.property(globalThis, 'window', {});
  t.mock.property(globalThis, 'document', { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } });
  t.mock.property(globalThis, 'localStorage', { getItem: () => null, setItem: () => {} });
  assert.equal(initMetaPixel("123';alert(1)"), false);
  trackMetaEvent('123', 'PageView');
  trackMetaEvent('456', 'AddToCart', { value: 10 });
  trackMetaPurchase('order-1', { total: 10, metaTracking: { pixelId: '456' } });
  trackMetaPurchase('order-1', { total: 10, metaTracking: { pixelId: '456' } });
  assert.equal(scripts.length, 1);
  const purchases = window.fbq.queue.filter(args => args[2] === 'Purchase');
  assert.equal(purchases.length, 1);
  assert.deepEqual(purchases[0], ['trackSingle', '456', 'Purchase', { value: 10, currency: 'BRL' }, { eventID: 'order-1' }]);
});

test('only the original buyer can attribute Meta purchases from a paid tracking link', t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else delete globalThis.window;
  });

  globalThis.window = { localStorage: { getItem: () => 'order-123' } };
  assert.equal(isOriginalBuyerForMetaPurchase('order-123'), true);
  assert.equal(isOriginalBuyerForMetaPurchase('order-shared'), false);
  assert.equal(isOriginalBuyerForMetaPurchase(''), false);

  // Privacy settings may block storage and must not break order tracking.
  globalThis.window = { localStorage: { getItem() { throw new Error('blocked'); } } };
  assert.equal(isOriginalBuyerForMetaPurchase('order-123'), false);
});
