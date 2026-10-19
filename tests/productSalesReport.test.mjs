import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductSales } from '../src/lib/productSalesReport.js';
test('quantidade e receita por produto', () => { const result = buildProductSales([{ id: '1', total: 200, items: [{ id: 'a', name: 'A', price: 10, quantity: 2 }] }]); assert.equal(result.products[0].revenue, 20); assert.equal(result.products[0].quantity, 2); });
