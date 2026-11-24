import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsOption, containerOption, adsOption, handleGoogleConnect } from '../server/googleConnect.js';

test('GA4 preserva o ID da propriedade e o ID do fluxo web', () => {
  const account = { displayName: 'Empresa' };
  const property = { property: 'properties/123456', displayName: 'Loja' };
  const stream = { name: 'properties/123456/dataStreams/42', displayName: 'Site', type: 'WEB_DATA_STREAM', webStreamData: { measurementId: 'G-ABC123', defaultUri: 'https://loja.example' } };
  assert.deepEqual(analyticsOption(account, property, stream).config, { measurementId: '123456', frontendMeasurementId: 'G-ABC123' });
  assert.equal(analyticsOption(account, property, { ...stream, type: 'ANDROID_APP_DATA_STREAM' }), null);
  assert.equal(analyticsOption(account, property, { ...stream, webStreamData: { measurementId: 'bad' } }), null);
});

test('GTM usa apenas containers web com ID público válido', () => {
  const account = { name: 'Empresa' };
  const container = { path: 'accounts/1/containers/2', name: 'Loja', publicId: 'GTM-ABC123', usageContext: ['web'] };
  assert.deepEqual(containerOption(account, container).config, { containerId: 'GTM-ABC123' });
  assert.equal(containerOption(account, { ...container, usageContext: ['android'] }), null);
});

test('Ads só aceita conversões web de compra e extrai AW e label', () => {
  const customer = { id: '1234567890', descriptiveName: 'Empresa' };
  const action = { type: 'WEBPAGE', status: 'ENABLED', category: 'PURCHASE', resourceName: 'customers/1234567890/conversionActions/1', name: 'Compra', tagSnippets: [{ eventSnippet: "gtag('event', 'conversion', {'send_to': 'AW-123456/abc_DEF-123'});" }] };
  assert.deepEqual(adsOption(customer, action).config, { conversionId: 'AW-123456', conversionLabel: 'abc_DEF-123', customerId: '1234567890' });
  assert.equal(adsOption(customer, { ...action, category: 'LEAD' }), null);
  assert.equal(adsOption(customer, { ...action, tagSnippets: [] }), null);
});

function response() {
  return { code: 0, data: null, setHeader() {}, status(n) { this.code = n; return this; }, json(data) { this.data = data; return this; } };
}

test('OAuth rejeita usuário sem sessão e usuário sem acesso à loja', async () => {
  const req = { method: 'POST', body: { action: 'start', storeId: 'mercadomonteverde', service: 'ga4' } };
  const first = response();
  await handleGoogleConnect(req, first, { db: null, assertStoreAccess() { throw Error('não deveria chegar'); } });
  assert.equal(first.code, 401);
  const second = response();
  await handleGoogleConnect({ ...req, user: { uid: 'u1' } }, second, { db: null, assertStoreAccess() { throw Object.assign(Error('negado'), { statusCode: 403 }); } });
  assert.equal(second.code, 403);
});

test('OAuth limita escopos, usa PKCE, criptografa sessão e isola usuário e loja', async () => {
  const values = { GOOGLE_CONNECT_ENCRYPTION_KEY: 'ab'.repeat(32), GOOGLE_CONNECT_PILOT_STORES: 'mercadomonteverde', GOOGLE_CONNECT_REDIRECT_URI: 'https://preview.example/api/google-callback', GOOGLE_CLIENT_ID: 'fake-client-id', GOOGLE_CLIENT_SECRET: 'fake-client-secret' };
  const original = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
  Object.assign(process.env, values);
  try {
    const docs = new Map();
    const db = { collection() { return { doc(id) { return { async create(data) { docs.set(id, data); }, async get() { return { exists: docs.has(id), data: () => docs.get(id) }; } }; } }; } };
    const dependencies = { db, assertStoreAccess: async () => {} };
    const request = { method: 'POST', user: { uid: 'u1' }, body: { action: 'start', storeId: 'mercadomonteverde', service: 'ga4' } };
    const start = response();
    await handleGoogleConnect(request, start, dependencies);
    assert.equal(start.code, 200);
    const url = new URL(start.data.url);
    assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/analytics.readonly');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.match(start.data.state, /^velo_gc_[a-f0-9]{64}$/);
    assert.equal(JSON.stringify([...docs.values()]).includes('mercadomonteverde'), false);
    const status = { ...request, body: { ...request.body, action: 'status', state: start.data.state } };
    const ok = response();
    await handleGoogleConnect(status, ok, dependencies);
    assert.equal(ok.data.status, 'pending');
    const other = response();
    await handleGoogleConnect({ ...status, user: { uid: 'u2' } }, other, dependencies);
    assert.equal(other.code, 403);
    const otherStore = response();
    await handleGoogleConnect({ ...status, body: { ...status.body, storeId: 'outra-loja' } }, otherStore, dependencies);
    assert.equal(otherStore.code, 403);
    const nonPilot = response();
    await handleGoogleConnect({ ...request, body: { ...request.body, storeId: 'outra-loja' } }, nonPilot, dependencies);
    assert.equal(nonPilot.code, 503);
  } finally {
    for (const [k, v] of Object.entries(original)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
