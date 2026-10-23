import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBeginCheckoutPayload, buildAddToCartPayload } from './checkoutTracking.js';

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

test('add_to_cart usa GA4 da loja atual, quantidade e valor total correto', () => {
  assert.deepEqual(buildAddToCartPayload({ id: 'prod-1', name: 'Produto teste' }, 3, 4.5, 'G-3MZRMRQ8XJ'), {
    send_to: 'G-3MZRMRQ8XJ',
    currency: 'BRL',
    value: 13.5,
    items: [{
      item_id: 'prod-1',
      item_name: 'Produto teste',
      price: 4.5,
      quantity: 3,
    }],
  });
});

test('add_to_cart não dispara para ID de outra integração ou item inválido', () => {
  const product = { id: 'p1', name: 'Produto' };
  assert.equal(buildAddToCartPayload(product, 1, 10, ''), null);
  assert.equal(buildAddToCartPayload(product, 1, 10, 'AW-123456'), null);
  assert.equal(buildAddToCartPayload({ name: 'Produto' }, 1, 10, 'G-ABC123'), null);
  assert.equal(buildAddToCartPayload(product, 0, 10, 'G-ABC123'), null);
  assert.equal(buildAddToCartPayload(product, 1, -1, 'G-ABC123'), null);
});
