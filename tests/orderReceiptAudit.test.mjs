import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessPrintedOrderTotal } from '../src/lib/orderReceiptAudit.js';

test('os dois descontos do incidente reconciliam individualmente mas exigem travamento da versao impressa', () => {
  const base = { subtotal: 23.98, shippingFee: 8, extraFee: 0, usedCashback: 0 };
  assert.deepEqual(assessPrintedOrderTotal({ ...base, discountAmount: 3.6, total: 28.38 }).ok, true);
  assert.deepEqual(assessPrintedOrderTotal({ ...base, discountAmount: 5.8, total: 26.18 }).ok, true);
  assert.equal(assessPrintedOrderTotal({ ...base, discountAmount: 5.8, total: 28.38 }).ok, false);
});

test('cashback e taxas extras sao considerados e pedidos legados ficam sem valor inventado', () => {
  assert.equal(assessPrintedOrderTotal({
    subtotal: 30, shippingFee: 5, extraFee: 2, discountAmount: 3, usedCashback: 4, total: 30
  }).ok, true);
  assert.equal(assessPrintedOrderTotal({ total: 10 }).checked, false);
  assert.equal(assessPrintedOrderTotal({ total: NaN }).ok, false);
});

test('o painel possui apenas um gatilho automatico, transacao de reserva e cabecalho confiavel', () => {
  const code = readFileSync(new URL('../src/pages/AdminLegacy.jsx', import.meta.url), 'utf8');
  const autoStart = code.indexOf('if (shouldPrint) {');
  const autoEnd = code.indexOf('initialOrders = false;', autoStart);
  assert.ok(autoStart >= 0 && autoEnd > autoStart);
  const flow = code.slice(autoStart, autoEnd);
  assert.match(flow, /await runTransaction\(db,/);
  assert.match(flow, /tx\.update\(orderRef,/);
  assert.match(flow, /autoPrintedTotal: Number\(latestOrder\.total\)/);
  assert.match(flow, /assessPrintedOrderTotal\(latestOrder\)/);
  assert.doesNotMatch(flow, /updateDoc\(doc\(db, "orders", newOrderData\.id\)/);
  assert.doesNotMatch(code, /printLabel\(\{ \.\.\.order, status: newStatus \}\)/);
  assert.doesNotMatch(code, /printLabel\(\{ \.\.\.editingOrderData, \.\.\.dataParaSalvar/);
  assert.match(code, /freshStoreData\?\.name/);
  assert.match(code, /offline_credit_card: 'CARTAO DE CREDITO \(NA ENTREGA\)'/);
});
