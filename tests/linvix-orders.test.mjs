import assert from 'node:assert/strict';
import test from 'node:test';
import { assessLinvixOrder, buildVeloOrderDraft, previewLinvixOrders } from '../lib/linvix-orders.js';

const storeId = 'monte-verde-unidade-a';
const base = {
  storeId,
  status: 'preparing',
  paymentStatus: 'paid',
  total: 30,
  customerName: 'NÃO INCLUIR',
  customerPhone: '51999999999',
  customerAddress: 'NÃO INCLUIR',
  items: [{ id: 'produto-1', gtin: '7891234567890', quantity: 2, price: 15 }],
};

test('pedido pago e confirmado é candidato apenas a mapeamento, não à exportação', () => {
  const result = assessLinvixOrder(base, 'pedido-01', storeId);
  assert.equal(result.category, 'mapping_candidate');
  assert.equal(result.reason, 'pronto_para_mapear_com_erp');
  const draft = buildVeloOrderDraft(result, { id: 'local-01' });
  assert.equal(draft.exportEnabled, false);
  assert.equal(draft.locationId, 'local-01');
  assert.equal(draft.reference, 'velo:monte-verde-unidade-a:pedido-01');
  assert.equal(draft.items[0].quantity, 2);
  assert.ok(!JSON.stringify(draft).includes('51999999999'));
  assert.ok(!JSON.stringify(draft).includes('NÃO INCLUIR'));
});

test('pedido com pagamento pendente nunca vira candidato automaticamente', () => {
  const result = assessLinvixOrder({ ...base, paymentStatus: 'pending' }, 'p2', storeId);
  assert.equal(result.category, 'review');
  assert.equal(result.reason, 'pagamento_nao_confirmado');
  assert.throws(() => buildVeloOrderDraft(result, { id: 'l1' }), /não está pronto/);
});

test('pedidos cancelados ou não confirmados são ignorados', () => {
  assert.equal(assessLinvixOrder({ ...base, status: 'canceled' }, 'p3', storeId).category, 'ignored');
  assert.equal(assessLinvixOrder({ ...base, status: 'pending' }, 'p4', storeId).category, 'ignored');
  assert.equal(assessLinvixOrder({ ...base, status: 'aguardando_pagamento' }, 'p5', storeId).category, 'ignored');
});

test('código ERP ausente pede revisão, sem assumir ID Velo como código Linvix', () => {
  const result = assessLinvixOrder({
    ...base, items: [{ id: 'produto-1', quantity: 2, price: 15 }],
  }, 'p6', storeId);
  assert.equal(result.category, 'review');
  assert.equal(result.reason, 'produtos_sem_codigo_erp');
});

test('não aceita itens sem quantidade, preço ou produto', () => {
  for (const invalid of [
    { id: 'p1', gtin: '789', quantity: 0, price: 5 },
    { id: 'p1', gtin: '789', quantity: 2 },
    { gtin: '789', quantity: 1, price: 5 },
  ]) {
    const result = assessLinvixOrder({ ...base, items: [invalid] }, 'x', storeId);
    assert.equal(result.category, 'review');
    assert.equal(result.reason, 'dados_dos_itens_incompletos');
  }
});

test('rejeita pedido cuja loja difere do contexto autorizado', () => {
  assert.throws(() => assessLinvixOrder(base, 'p7', 'monte-verde-unidade-b'), /fora do escopo/);
});

test('rascunho exige estoque local e tem referência determinística', () => {
  const p = assessLinvixOrder(base, 'p8', storeId);
  assert.throws(() => buildVeloOrderDraft(p, {}), /Estoque Local/);
  const a = buildVeloOrderDraft(p, { id: 'estoque-a' });
  const b = buildVeloOrderDraft(p, { id: 'estoque-a' });
  assert.deepEqual(a, b);
});

test('prévia consulta somente pedidos da unidade e não escreve no banco', async () => {
  const calls = [];
  const docs = [
    { id: 'o1', data: () => ({ ...base }) },
    { id: 'o2', data: () => ({ ...base, paymentStatus: 'pending' }) },
    { id: 'o3', data: () => ({ ...base, status: 'cancelled' }) },
  ];
  const db = {
    collection(collectionName) {
      calls.push('collection:' + collectionName);
      return {
        where(field, operator, value) {
          calls.push('where:' + field + ':' + operator + ':' + value);
          return {
            limit(number) {
              calls.push('limit:' + number);
              return { get: async () => ({ docs, size: docs.length }) };
            },
          };
        },
      };
    },
  };
  const result = await previewLinvixOrders(db, storeId);
  assert.equal(result.scanned, 3);
  assert.equal(result.mappingCandidates, 1);
  assert.equal(result.needReview, 1);
  assert.equal(result.ignored, 1);
  assert.equal(result.exportEnabled, false);
  assert.deepEqual(calls, [
    'collection:orders',
    'where:storeId:==:' + storeId,
    'limit:200',
  ]);
  assert.ok(!JSON.stringify(result).includes('NÃO INCLUIR'));
  assert.ok(!JSON.stringify(result).includes('51999999999'));
});
