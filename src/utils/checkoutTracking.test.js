import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBeginCheckoutPayload } from './checkoutTracking.js';

test('begin_checkout usa somente GA4 da loja e itens reais do carrinho', () => {
  assert.deepEqual(buildBeginCheckoutPayload([
    { id: 'a', name: 'Água', price: 4.5, quantity: 2 },
    { id: 'b', name: 'Produto fracionado', price: 12, quantity: 0.5 },
  ], 'G-3MZRMRQ8XJ'), {
    send_to: 'G-3MZRMRQ8XJ', currency: 'BRL', value: 15,
    items: [
      { item_id: 'a', item_name: 'Água', price: 4.5, quantity: 2 },
      { item_id: 'b', item_name: 'Produto fracionado', price: 12, quantity: 0.5 },
    ],
  });
});

test('checkout vazio, sem GA4 ou com itens inválidos não gera evento', () => {
  assert.equal(buildBeginCheckoutPayload([], 'G-ABC123'), null);
  assert.equal(buildBeginCheckoutPayload([{ id: 'a', price: 3, quantity: 1 }], ''), null);
  assert.equal(buildBeginCheckoutPayload([{ id: 'a', price: 3, quantity: 1 }], 'AW-12345'), null);
  assert.equal(buildBeginCheckoutPayload([{ id: 'a', price: -3, quantity: 1 }], 'G-ABC123'), null);
  assert.equal(buildBeginCheckoutPayload([{ id: 'a', price: 3, quantity: 0 }], 'G-ABC123'), null);
});
