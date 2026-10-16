import test from 'node:test';
import assert from 'node:assert/strict';
import { isWeightedProduct, getWeightStepGrams, getMinWeightGrams, quantityKgFromGrams, gramsFromInput, validateWeight, formatWeight, formatCartQuantity, totalWeightPrice } from '../src/lib/weightProducts.js';

test('produto comum mantém a quantidade por unidade', () => {
  assert.equal(isWeightedProduct({ saleUnit: 'un' }), false);
  assert.equal(formatCartQuantity({ quantity: 2, saleUnit: 'un' }), '2 un.');
});
test('converte gramas e kg digitados com vírgula', () => {
  assert.equal(gramsFromInput('500', 'g'), 500);
  assert.equal(gramsFromInput('1,5', 'kg'), 1500);
  assert.equal(gramsFromInput('0.25', 'kg'), 250);
  assert.equal(quantityKgFromGrams(1500), 1.5);
  assert.equal(formatWeight(1.5), '1,5 kg');
  assert.equal(formatWeight(0.5), '500 g');
});
test('não aceita quantidades negativas, malformadas ou abaixo do passo', () => {
  const p = { saleUnit: 'kg', weightStepGrams: 250, minWeightGrams: 250, stock: 3 };
  assert.match(validateWeight(p, 100), /mínimo/);
  assert.match(validateWeight(p, 300), /múltiplos/);
  assert.match(validateWeight(p, 3000, 0.5), /Estoque/);
  assert.equal(validateWeight(p, 1500), null);
  assert.ok(Number.isNaN(gramsFromInput('-1', 'kg')));
  assert.ok(Number.isNaN(gramsFromInput('0.2222', 'kg')));
});
test('calcula 500 g e 1,5 kg com preço por kg e centavos', () => {
  assert.equal(totalWeightPrice(39.9, 500), 19.95);
  assert.equal(totalWeightPrice(39.9, 1500), 59.85);
});
test('padrões seguros de mínimo/passo', () => {
  assert.equal(getWeightStepGrams({}), 100);
  assert.equal(getMinWeightGrams({}), 100);
  assert.equal(getWeightStepGrams({ weightStepGrams: 0 }), 100);
});
