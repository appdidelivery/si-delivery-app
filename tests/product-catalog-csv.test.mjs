import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimitedCsv, parseProductCatalogCsv, exportProductCatalogCsv } from '../src/lib/productCatalogCsv.js';

test('preserva codigos com zeros e interpreta decimal ponto', () => {
  const parsed = parseProductCatalogCsv('\uFEFFcodigo;descricao;grupo;preco_custo;preco_venda;unidade\n000001;ALHO KG;HORTIFRUTI;25.84;35.99;kg');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].code, '000001');
  assert.equal(parsed.rows[0].price, 35.99);
  assert.equal(parsed.rows[0].saleUnit, 'kg');
});

test('aceita delimitador virgula, decimais brasileiros com ponto-e-virgula e aspas', () => {
  const quoted = parseDelimitedCsv('codigo,descricao,preco_venda\n"000002","Produto, Premium","12.50"');
  assert.equal(quoted[1][1], 'Produto, Premium');
  const parsed = parseProductCatalogCsv('codigo;descricao;grupo;preco_custo;preco_venda\n000002;"Produto; Premium";MERCEARIA;2,50;12,99');
  assert.equal(parsed.rows[0].name, 'Produto; Premium');
  assert.equal(parsed.rows[0].price, 12.99);
});

test('ignora duplicatas e bloqueia preco zero e registros sem codigo', () => {
  const parsed = parseProductCatalogCsv(
    'codigo;descricao;grupo;preco_custo;preco_venda\n' +
    '000001;Original;PADARIA;1;3\n' +
    '000001;Duplicado;PADARIA;1;3\n' +
    '000003;Preco zerado;PADARIA;1;0\n' +
    ';Sem codigo;PADARIA;1;5'
  );
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.duplicateCount, 1);
  assert.equal(parsed.errors.length, 2);
});

test('categoriza sem grupo para revisao', () => {
  const parsed = parseProductCatalogCsv('codigo;descricao;grupo;preco_venda\n000003;Item;;3');
  assert.equal(parsed.rows[0].category, 'A CLASSIFICAR');
  assert.equal(parsed.uncategorizedCount, 1);
});

test('exportacao permite roundtrip sem perder SKU ou unidade', () => {
  const csv = exportProductCatalogCsv([{
    id: 'firestore-id', storeId: 'monte-verde',
    sku: '000099', name: 'BIFE KG', category: 'ACOUGUE', price: 49.9,
    costPrice: 24.4, stock: '', saleUnit: 'kg', isActive: false
  }]);
  const result = parseProductCatalogCsv(csv);
  assert.equal(result.rows[0].code, '000099');
  assert.equal(result.rows[0].idVelo, 'firestore-id');
  assert.equal(result.rows[0].saleUnit, 'kg');
  assert.equal(result.rows[0].active, false);
});
