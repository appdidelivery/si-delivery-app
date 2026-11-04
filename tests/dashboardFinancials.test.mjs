import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFinancialHistory, countsAsSale, toFinancialNumber } from '../lib/dashboardFinancials.js';

const NOW = Date.parse('2026-11-04T18:00:00.000Z');
const DAY = 86400000;
const order = (daysAgo, overrides = {}) => ({
  createdAt: { toMillis: () => NOW - daysAgo * DAY },
  total: 100,
  status: 'delivered',
  paymentMethod: 'cash',
  items: [{ price: 80, costPrice: 30, quantity: 1 }],
  ...overrides
});

test('não repete os valores de 30 dias quando há mais de 800 pedidos', () => {
  const orders = [
    ...Array.from({ length: 800 }, () => order(5)),
    ...Array.from({ length: 70 }, () => order(60)),
    ...Array.from({ length: 25 }, () => order(220))
  ];
  const result = summarizeFinancialHistory(orders, NOW);
  assert.equal(result['7'].revenue, 80000);
  assert.equal(result['30'].revenue, 80000);
  assert.equal(result['180'].revenue, 87000);
  assert.equal(result['365'].revenue, 89500);
  assert.equal(result['30'].orderCount, 800);
  assert.equal(result['365'].orderCount, 895);
  assert.equal(result['365'].profit, 895 * 50);
});

test('não inclui pedidos cancelados, reembolsados, pagamentos online pendentes ou futuros', () => {
  const orders = [
    order(1),
    order(1, { status: 'cancelled' }),
    order(1, { paymentStatus: 'refunded' }),
    order(1, { paymentMethod: 'pix', paymentStatus: 'pending' }),
    order(1, { status: 'awaiting_payment' }),
    order(-1)
  ];
  const result = summarizeFinancialHistory(orders, NOW);
  assert.equal(result['7'].revenue, 100);
  assert.equal(result['7'].orderCount, 1);
  assert.equal(countsAsSale(order(1, { paymentMethod: 'cash', paymentStatus: 'pending' })), true);
});

test('lucro estimado considera apenas itens com custo cadastrado, inclusive custo zero', () => {
  const orders = [order(2, {
    total: 150,
    items: [
      { price: 40, costPrice: 25, quantity: 2 },
      { price: 10, quantity: 3 },
      { price: 20, costPrice: 0, quantity: 1 }
    ]
  })];
  const result = summarizeFinancialHistory(orders, NOW);
  assert.equal(result['7'].revenue, 150);
  assert.equal(result['7'].profit, 50);
  assert.equal(result['7'].itemsMissingCost, 1);
  assert.equal(result['7'].pricedItemCount, 2);
});

test('suporta Timestamp Firestore, string monetária brasileira e limites de período', () => {
  const orders = [
    order(30, { total: '1.234,56', createdAt: { seconds: (NOW - 30 * DAY) / 1000 } }),
    order(181),
    order(366)
  ];
  const result = summarizeFinancialHistory(orders, NOW);
  assert.equal(result['7'].revenue, 0);
  assert.equal(result['30'].revenue, 1234.56);
  assert.equal(result['180'].revenue, 1234.56);
  assert.equal(result['365'].revenue, 1334.56);
  assert.equal(toFinancialNumber('R$ 1.234,56'), 1234.56);
});
