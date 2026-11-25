import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsOption, containerOption, adsOption, handleGoogleConnect, assertGoogleIntegrationAccess, handleGoogleConnectCallback } from '../server/googleConnect.js';

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

test('Google Connect autoriza o UID cadastrado apenas na loja concedida', async () => {
  const previous = process.env.GOOGLE_CONNECT_STORE_UIDS;
  process.env.GOOGLE_CONNECT_STORE_UIDS = JSON.stringify({ piloto: ['titular', 'equipe-ativa'] });
  try {
    await assertGoogleIntegrationAccess({ uid: 'titular' }, 'piloto');
    await assertGoogleIntegrationAccess({ uid: 'equipe-ativa' }, 'piloto');
    await assert.rejects(() => assertGoogleIntegrationAccess({ uid: 'titular' }, 'outra'), { statusCode: 403 });
    await assert.rejects(() => assertGoogleIntegrationAccess({ uid: 'sem-acesso', email_verified: true }, 'piloto'), { statusCode: 403 });
    await assert.rejects(() => assertGoogleIntegrationAccess(null, 'piloto'), { statusCode: 401 });
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_CONNECT_STORE_UIDS;
    else process.env.GOOGLE_CONNECT_STORE_UIDS = previous;
  }
});

test('Homologação conclui seleção sem escrever configuração ou credencial da loja', async () => {
  const values = { VERCEL_ENV: 'preview', GOOGLE_CONNECT_ENCRYPTION_KEY: 'ab'.repeat(32), GOOGLE_CONNECT_PILOT_STORES: 'mercadomonteverde', GOOGLE_CONNECT_REDIRECT_URI: 'https://preview.example/api/google-callback', GOOGLE_CLIENT_ID: 'fake-client-id', GOOGLE_CLIENT_SECRET: 'fake-client-secret' };
  const original = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, values);
  const docs = new Map();
  const touched = [];
  const db = {
    collection(name) {
      touched.push(name);
      return { doc(id) {
        const k = name + '/' + id;
        return { k, async create(data) { docs.set(k, data); }, async update(data) { docs.set(k, { ...docs.get(k), ...data }); }, async get() { return { exists: docs.has(k), data: () => docs.get(k) }; } };
      } };
    },
    async runTransaction(fn) {
      return fn({ get: ref => ref.get(), update: (ref, data) => docs.set(ref.k, { ...docs.get(ref.k), ...data }), delete: ref => docs.delete(ref.k), set: () => assert.fail('Homologação não pode persistir configuração') });
    }
  };
  let reportAllowed = false;
  let reportCalls = 0;
  globalThis.fetch = async (url, options) => {
    const u = String(url);
    const response = data => ({ ok: true, json: async () => data });
    if (u.includes('oauth2.googleapis.com/token')) return response({ access_token: 'test', refresh_token: 'test-refresh', scope: 'https://www.googleapis.com/auth/analytics.readonly' });
    if (u.includes('accountSummaries')) return response({ accountSummaries: [{ displayName: 'Empresa', propertySummaries: [{ property: 'properties/123', displayName: 'Loja' }] }] });
    if (u.includes('/dataStreams')) return response({ dataStreams: [{ name: 'properties/123/dataStreams/1', displayName: 'Web', type: 'WEB_DATA_STREAM', webStreamData: { measurementId: 'G-TEST123' } }] });
    if (u === 'https://analyticsdata.googleapis.com/v1beta/properties/123:runReport') {
      reportCalls++;
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test');
      assert.deepEqual(JSON.parse(options.body).metrics, [{ name: 'sessions' }]);
      return reportAllowed ? response({ rows: [] }) : { ok: false, status: 403 };
    }
    throw Error('URL inesperada no teste: ' + u);
  };
  try {
    const req = { method: 'POST', user: { uid: 'owner' }, body: { action: 'start', storeId: 'mercadomonteverde', service: 'ga4' } };
    const deps = { db, assertStoreAccess: async () => {} };
    const start = response();
    await handleGoogleConnect(req, start, deps);
    assert.equal(start.data.dryRun, true);
    const callback = response();
    callback.send = function(data) { this.data = data; return this; };
    await handleGoogleConnectCallback({ query: { state: start.data.state, code: 'test-code' } }, callback, db);
    assert.equal(callback.code, 200);
    const status = response();
    await handleGoogleConnect({ ...req, body: { ...req.body, action: 'status', state: start.data.state } }, status, deps);
    assert.equal(status.data.status, 'ready');
    const replay = response();
    replay.send = callback.send;
    await handleGoogleConnectCallback({ query: { state: start.data.state, code: 'test-code' } }, replay, db);
    assert.equal(replay.code, 400);
    const selection = { ...req, body: { ...req.body, action: 'select', state: start.data.state, optionId: status.data.options[0].id } };
    const denied = response();
    await handleGoogleConnect(selection, denied, deps);
    assert.equal(denied.code, 502);
    assert.equal(docs.size, 1);
    reportAllowed = true;
    const selected = response();
    await handleGoogleConnect(selection, selected, deps);
    assert.deepEqual(selected.data, { success: true, dryRun: true, verification: 'ga4-data-api' });
    assert.equal(reportCalls, 2);
    assert.equal(docs.size, 0);
    assert.equal(touched.includes('settings'), false);
    assert.equal(touched.includes('google_connect_credentials'), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(original)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});


test('Desconexão é bloqueada em homologação e preserva IDs e outras lojas em produção', async () => {
  const original = { VERCEL_ENV: process.env.VERCEL_ENV, GOOGLE_CONNECT_DRY_RUN: process.env.GOOGLE_CONNECT_DRY_RUN };
  const mutations = [];
  const db = {
    collection(name) { return { doc(id) { return { name, id }; } }; },
    async runTransaction(fn) {
      return fn({
        get: async () => ({ data: () => ({ integrations: { ga4: { authMode: 'oauth', measurementId: '123', frontendMeasurementId: 'G-TEST123' } } }) }),
        update: (ref, data) => mutations.push({ ref, data }),
        delete: ref => mutations.push({ ref, deleted: true })
      });
    }
  };
  const req = { method: 'POST', user: { uid: 'owner' }, body: { action: 'disconnect', storeId: 'mercadomonteverde', service: 'ga4' } };
  const deps = { db, assertStoreAccess: async (user, store) => { if (store !== 'mercadomonteverde') throw Object.assign(Error('negado'), { statusCode: 403 }); } };
  try {
    process.env.VERCEL_ENV = 'production';
    process.env.GOOGLE_CONNECT_DRY_RUN = 'true';
    const dry = response();
    await handleGoogleConnect(req, dry, deps);
    assert.equal(dry.code, 409);
    assert.equal(mutations.length, 0);
    process.env.GOOGLE_CONNECT_DRY_RUN = 'false';
    const denied = response();
    await handleGoogleConnect({ ...req, body: { ...req.body, storeId: 'outra-loja' } }, denied, deps);
    assert.equal(denied.code, 403);
    assert.equal(mutations.length, 0);
    const ok = response();
    await handleGoogleConnect(req, ok, deps);
    assert.equal(ok.code, 200);
    assert.deepEqual(mutations, [
      { ref: { name: 'settings', id: 'mercadomonteverde' }, data: { 'integrations.ga4.authMode': 'manual', 'integrations.ga4.resourceName': null, 'integrations.ga4.connectedAt': null } },
      { ref: { name: 'google_connect_credentials', id: 'mercadomonteverde_ga4' }, deleted: true }
    ]);
  } finally {
    for (const [k, v] of Object.entries(original)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('Diagnóstico não confunde container configurado com leitura GA4 saudável', async () => {
  const db = { collection() { return { doc() { return { get: async () => ({ data: () => ({ integrations: { gtm: { authMode: 'oauth', containerId: 'GTM-TEST123' } } }) }) }; } }; } };
  const deps = { db, assertStoreAccess: async () => {} };
  const req = { method: 'POST', user: { uid: 'owner' }, body: { action: 'connection', storeId: 'mercadomonteverde', service: 'gtm' } };
  const configured = response();
  await handleGoogleConnect(req, configured, deps);
  assert.deepEqual(configured.data, { status: 'configured' });
  const disconnected = response();
  await handleGoogleConnect({ ...req, body: { ...req.body, service: 'ga4' } }, disconnected, deps);
  assert.deepEqual(disconnected.data, { status: 'disconnected' });
});
