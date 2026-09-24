import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// Executa o roteador real, substituindo somente as dependências externas.
// Não carrega .env, SDKs, certificados, credenciais ou conexões de rede.
const source = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8')
  .replace(/^import .*;.*$/gm, '')
  .replace('export default async function handler', 'async function handler')
  .replace(/^export const /gm, 'const ');
const routes = ['mp', 'mp-pix', 'efi-pix'];
function harness(user = { uid: 'owner-a' }, userProfile = { storeId: 'shop-a' }) {
  const calls = [];
  const stores = {
    'shop-a': { ownerUid: 'owner-a', faturasHistorico: [
      { id: 'pending', status: 'PENDENTE', amount: 329.90 },
      { id: 'lower', status: 'pendente', total: 99.90 },
      { id: 'paid', status: 'PAGO', amount: 49.90 },
      { id: 'zero', status: 'PENDENTE', amount: 0 },
    ] },
    'shop-b': { ownerUid: 'owner-b', faturasHistorico: [] },
  };
  const db = { collection: (collection) => ({ doc: (id) => ({ get: async () => {
    const data = collection === 'stores' ? stores[id] : id === user?.uid ? userProfile : undefined;
    return { exists: !!data, data: () => data };
  } }) }) };
  class Efi {
    async pixCreateImmediateCharge(_, body) {
      calls.push({ amount: Number(body.valor.original) });
      return { loc: { id: 1 }, txid: 'fake' };
    }
    async pixGenerateQRCode() { return { imagemQrcode: 'data:image/png;base64,fake', qrcode: 'fake' }; }
  }
  const context = vm.createContext({
    URL, Buffer, console: { log() {}, warn() {}, error() {} }, pathModule: path,
    process: { env: { MP_ACCESS_TOKEN: 'fake', EFI_PIX_KEY: 'fake' }, cwd: () => '/fake' },
    Stripe: class {}, Gerencianet: Efi,
    admin: { apps: [{}], firestore: () => db, auth: () => ({ verifyIdToken: async (token) => {
      if (token !== 'valid' || !user) throw new Error('invalid token');
      return user;
    } }) },
    fetch: async (url, init) => {
      assert.match(url, /^https:\/\/api\.mercadopago\.com\//);
      const body = JSON.parse(init.body);
      calls.push({ amount: body.items?.[0]?.unit_price ?? body.transaction_amount });
      return { ok: true, json: async () => ({ init_point: 'https://example.invalid', id: 1,
        point_of_interaction: { transaction_data: { qr_code_base64: 'fake', qr_code: 'fake' } } }) };
    },
  });
  vm.runInContext(source, context);
  return { calls, async request(route, body, token = 'valid') {
    const req = { method: 'POST', url: `/api/pay-subscription-${route}`, query: {}, body,
      headers: { host: 'preview.invalid', ...(token ? { authorization: `Bearer ${token}` } : {}) } };
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; } };
    await context.handler(req, res);
    return res;
  } };
}
for (const route of routes) {
  for (const [name, token] of [['sem sessão', null], ['token inválido', 'invalid']]) {
    test(`${route}: rejeita ${name} antes de cobrar`, async () => {
      const h = harness();
      assert.equal((await h.request(route, { storeId: 'shop-a', plan: 'start' }, token)).code, 401);
      assert.equal(h.calls.length, 0);
    });
  }
  test(`${route}: usuário da loja A não cobra loja B`, async () => {
    const h = harness();
    assert.equal((await h.request(route, { storeId: 'shop-b', plan: 'start', admin: true })).code, 403);
    assert.equal(h.calls.length, 0);
  });
  test(`${route}: e-mail master sem claim não concede acesso global`, async () => {
    const h = harness({ uid: 'outsider', email: 'appdidelivery@gmail.com' }, {});
    assert.equal((await h.request(route, { storeId: 'shop-b', plan: 'start' })).code, 403);
    assert.equal(h.calls.length, 0);
  });
  for (const claim of ['admin', 'superAdmin']) {
    test(`${route}: claim verificada ${claim} permite acesso global`, async () => {
      const h = harness({ uid: 'master', [claim]: true }, {});
      assert.equal((await h.request(route, { storeId: 'shop-b', plan: 'start' })).code, 200);
      assert.equal(h.calls[0].amount, 49.90);
    });
  }
  for (const [plan, cycle, amount] of [
    ['start', 'monthly', 49.90], ['pro', 'monthly', 149.90], ['infinity', 'monthly', 249.90],
    ['start', 'semestral', 254.49], ['pro', 'semestral', 764.49], ['infinity', 'semestral', 1274.49],
  ]) {
    test(`${route}: ${plan}/${cycle} ignora amount adulterado`, async () => {
      const h = harness();
      assert.equal((await h.request(route, { storeId: 'shop-a', invoiceId: 'avulsa', plan, cycle, amount: 0.01 })).code, 200);
      assert.equal(h.calls[0].amount, amount);
    });
  }
  for (const [invoiceId, amount] of [['pending', 329.90], ['lower', 99.90]]) {
    test(`${route}: usa valor da fatura ${invoiceId}`, async () => {
      const h = harness();
      assert.equal((await h.request(route, { storeId: 'shop-a', invoiceId, amount: 0.01 })).code, 200);
      assert.equal(h.calls[0].amount, amount);
    });
  }
  for (const invoiceId of ['paid', 'zero', 'missing']) {
    test(`${route}: rejeita fatura ${invoiceId}`, async () => {
      const h = harness();
      assert.equal((await h.request(route, { storeId: 'shop-a', invoiceId })).code, 400);
      assert.equal(h.calls.length, 0);
    });
  }
  test(`${route}: plano inválido não chama provedor`, async () => {
    const h = harness();
    assert.equal((await h.request(route, { storeId: 'shop-a', plan: 'invalid' })).code, 400);
    assert.equal(h.calls.length, 0);
  });
}

for (const route of routes) {
  test(`${route}: proprietário sem perfil users pode cobrar sua loja`, async () => {
    const h = harness({ uid: 'owner-a' }, null);
    assert.equal((await h.request(route, { storeId: 'shop-a', plan: 'start' })).code, 200);
  });
  test(`${route}: vínculo users.storeId permite acesso à própria loja`, async () => {
    const h = harness({ uid: 'linked-user' }, { storeId: 'shop-a' });
    assert.equal((await h.request(route, { storeId: 'shop-a', plan: 'pro' })).code, 200);
  });
  test(`${route}: administrador não cobra loja inexistente`, async () => {
    const h = harness({ uid: 'master', admin: true }, {});
    assert.equal((await h.request(route, { storeId: 'missing', plan: 'start' })).code, 400);
    assert.equal(h.calls.length, 0);
  });
}
