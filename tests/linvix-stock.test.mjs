import assert from 'node:assert/strict';
import test from 'node:test';
import { linvixStockInternals } from '../lib/linvix.js';

const { belongsToLocation, getAvailableStock, updateProductsFromLocation } = linvixStockInternals;

test('localização: não confundir estoques com nomes repetidos', () => {
  const selected = { id: 'local-a', code: '1', name: 'Central' };
  assert.equal(belongsToLocation({ estoque_local_uuid: 'local-a', localizacao: 'Central' }, selected), true);
  assert.equal(belongsToLocation({ estoque_local_uuid: 'local-b', localizacao: 'Central' }, selected), false);
  assert.equal(belongsToLocation({ cod_local: '1', localizacao: 'Central' }, { code: '1' }), true);
  assert.equal(belongsToLocation({ cod_local: '2', localizacao: 'Central' }, { code: '1' }), false);
});

test('saldo: rejeitar valores ausentes e inválidos sem interpretar como zero', () => {
  assert.equal(getAvailableStock({ estoque_disponivel: 0 }), 0);
  assert.throws(() => getAvailableStock({}), /sem quantidade/);
  assert.throws(() => getAvailableStock({ estoque_disponivel: '' }), /sem quantidade/);
  assert.throws(() => getAvailableStock({ estoque_disponivel: 'desconhecido' }), /quantidade de estoque inválida/);
});

function createMockDatabase(products) {
  return {
    collection(name) {
      assert.equal(name, 'products');
      return {
        where(field, op, storeId) {
          assert.equal(field, 'storeId');
          assert.equal(op, '==');
          return {
            async get() {
              const docs = products
                .filter((product) => product.storeId === storeId)
                .map((product) => ({
                  ref: { id: product.id },
                  data: () => ({ ...product }),
                }));
              return { docs, size: docs.length };
            },
          };
        },
      };
    },
    batch() {
      const pending = [];
      return {
        update(ref, data) {
          pending.push({ ref, data });
        },
        async commit() {
          for (const item of pending) {
            const product = products.find((candidate) => candidate.id === item.ref.id);
            Object.assign(product, item.data);
          }
        },
      };
    },
  };
}

const admin = {
  firestore: { FieldValue: { serverTimestamp: () => 'test-timestamp' } },
};

test('sincronização: atualizar somente a loja e o estoque local selecionados', async () => {
  const products = [
    { id: 'p-a', storeId: 'loja-a', barcode: '78900001', stock: 3 },
    { id: 'p-b', storeId: 'loja-b', barcode: '78900001', stock: 75 },
  ];
  const stats = await updateProductsFromLocation({
    db: createMockDatabase(products),
    admin,
    storeId: 'loja-a',
    selectedLocation: { id: 'local-a', name: 'Estoque Principal' },
    balances: [
      { estoque_local_uuid: 'local-a', localizacao: 'Estoque Principal', cod_barras: '78900001', estoque_disponivel: 12 },
      { estoque_local_uuid: 'local-b', localizacao: 'Estoque Principal', cod_barras: '78900001', estoque_disponivel: 900 },
    ],
  });

  assert.equal(stats.updatedProducts, 1);
  assert.equal(stats.matchedProducts, 1);
  assert.equal(products[0].stock, 12);
  assert.equal(products[1].stock, 75);
});

test('sincronização: uma resposta inválida não sobrescreve o estoque', async () => {
  const products = [{ id: 'p-b', storeId: 'loja-b', barcode: '78900001', stock: 75 }];
  await assert.rejects(
    updateProductsFromLocation({
      db: createMockDatabase(products),
      admin,
      storeId: 'loja-b',
      selectedLocation: { id: 'local-b', name: 'Filial B' },
      balances: [{ estoque_local_uuid: 'local-b', cod_barras: '78900001', estoque_disponivel: 'indisponível' }],
    }),
    /quantidade de estoque inválida/
  );
  assert.equal(products[0].stock, 75);
});

test('sincronização: sem produto identificável não alterar saldo', async () => {
  const products = [{ id: 'p-a', storeId: 'loja-a', barcode: '78900001', stock: 4 }];
  await assert.rejects(
    updateProductsFromLocation({
      db: createMockDatabase(products),
      admin,
      storeId: 'loja-a',
      selectedLocation: { id: 'local-a', name: 'Loja A' },
      balances: [{ estoque_local_uuid: 'local-a', estoque_disponivel: 10 }],
    }),
    /Nenhum produto identificável/
  );
  assert.equal(products[0].stock, 4);
});
