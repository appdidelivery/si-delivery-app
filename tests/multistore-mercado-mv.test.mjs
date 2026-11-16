import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const api = readFileSync(new URL('../api/multistore.js', import.meta.url), 'utf8');
const switcher = readFileSync(new URL('../src/components/MultiStoreSwitcher.jsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/pages/AdminLegacy.jsx', import.meta.url), 'utf8');

test('Mercado MV está em grupo independente de Love/Xis e só lista lojas do grupo atual', () => {
  assert.match(api, /mercadoMV:\s*Object\.freeze\(\['mercadomonteverde', 'mercadomonteverdesacogrande'\]\)/);
  assert.match(api, /lanches:\s*Object\.freeze\(\['lovepicados', 'xisdale'\]\)/);
  assert.match(api, /groupStores\(currentStore\)\.map/);
  assert.match(api, /!groupStores\(currentStore\)\.includes\(target\)/);
  assert.match(api, /await permitted\(claims\.uid, claims, target\)/);
});

test('O backend reconhece os hosts reais MV e entrega ticket para o domínio correto', () => {
  assert.match(api, /mercadomonteverde: 'monteverde\.mercadomv\.com\.br'/);
  assert.match(api, /mercadomonteverdesacogrande: 'sacogrande\.mercadomv\.com\.br'/);
  assert.match(api, /host === domainFor\(id\)/);
  assert.match(api, /target === currentStore/);
  assert.match(api, /url: `https:\/\/\$\{domainFor\(target\)\}\/admin#multistore-ticket=\$\{ticket\}`/);
});

test('Seletor navega somente para host autorizado e está ligado ao desktop e mobile', () => {
  assert.match(switcher, /destination\.hostname !== STORES\[target\]\?\.host/);
  assert.match(switcher, /Unidade Monte Verde/);
  assert.match(switcher, /Unidade Saco Grande/);
  assert.match(switcher, /response\.stores\.filter/);
  assert.equal((admin.match(/<MultiStoreSwitcher currentStoreId=\{storeId\}/g) || []).length, 2);
  assert.equal((admin.match(/sacogrande\.mercadomv\.com\.br/g) || []).length, 2);
});
