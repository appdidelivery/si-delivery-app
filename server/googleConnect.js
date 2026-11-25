import crypto from 'node:crypto';

const scopes = {
  ga4: 'https://www.googleapis.com/auth/analytics.readonly',
  gtm: 'https://www.googleapis.com/auth/tagmanager.readonly',
  gads: 'https://www.googleapis.com/auth/adwords'
};
const productionCallback = 'https://app.velodelivery.com.br/api/google-callback';
function callbackUri() {
  const uri = process.env.GOOGLE_CONNECT_REDIRECT_URI || (process.env.VERCEL_ENV === 'production' ? productionCallback : '');
  if (!uri || !uri.startsWith('https://') || new URL(uri).pathname !== '/api/google-callback') throw fail('Callback Google Connect ainda não configurado para este ambiente.', 503);
  return uri;
}
const ttl = 10 * 60 * 1000;
const isDryRun = () => process.env.VERCEL_ENV !== 'production' || process.env.GOOGLE_CONNECT_DRY_RUN === 'true';
const sessions = 'google_connect_sessions';
const credentials = 'google_connect_credentials';
const statePattern = /^velo_gc_[a-f0-9]{64}$/;
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const key = () => {
  const secret = process.env.GOOGLE_CONNECT_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw fail('Google Connect ainda não foi habilitado pela Velo.', 503);
  return Buffer.from(secret, 'hex');
};
function seal(data, context) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  return [iv, Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]), cipher.getAuthTag()].map(x => x.toString('base64url')).join('.');
}
function unseal(value, context) {
  const [iv, ciphertext, tag] = String(value).split('.').map(x => Buffer.from(x, 'base64url'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString('utf8'));
}
async function google(url, token, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: 'Bearer ' + token, ...options.headers }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw fail('O Google recusou a consulta. Confira as permissões da conta e a API habilitada na Velo. (' + response.status + ')', 502);
  return response.json();
}
async function pages(url, token, field) {
  const result = [];
  let next;
  for (let i = 0; i < 50; i++) {
    const page = new URL(url);
    if (next) page.searchParams.set('pageToken', next);
    const data = await google(page, token);
    result.push(...(data[field] || []));
    next = data.nextPageToken;
    if (!next) return result;
  }
  throw fail('Há muitas contas Google. Solicite ajuda à equipe Velo.', 422);
}
export function analyticsOption(account, property, stream) {
  const id = String(property.property || '').match(/^properties\/(\d+)$/)?.[1];
  const measurement = stream.webStreamData?.measurementId;
  if (!id || !/^G-[A-Z0-9]+$/.test(measurement || '') || !stream.name || stream.type !== 'WEB_DATA_STREAM') return null;
  return { id: stream.name, label: [account.displayName, property.displayName, stream.displayName, stream.webStreamData.defaultUri].filter(Boolean).join(' · '), config: { measurementId: id, frontendMeasurementId: measurement } };
}
export function containerOption(account, container) {
  if (!container.path || !/^GTM-[A-Z0-9]+$/.test(container.publicId || '') || !container.usageContext?.includes('web')) return null;
  return { id: container.path, label: [account.name, container.name, container.domainName?.join(', ')].filter(Boolean).join(' · '), config: { containerId: container.publicId } };
}
export function adsOption(customer, action) {
  if (action.type !== 'WEBPAGE' || action.category !== 'PURCHASE' || action.status !== 'ENABLED' || !action.resourceName) return null;
  const snippet = (action.tagSnippets || []).map(x => x.eventSnippet || '').join('\n');
  const match = snippet.match(/['"]send_to['"]\s*:\s*['"](AW-\d+)\/([A-Za-z0-9_-]+)['"]/);
  if (!match) return null;
  return { id: action.resourceName, label: [customer.descriptiveName || customer.id, action.name, action.category].filter(Boolean).join(' · '), config: { conversionId: match[1], conversionLabel: match[2], customerId: String(customer.id) } };
}
async function discover(service, token) {
  const options = [];
  if (service === 'ga4') {
    const base = 'https://analyticsadmin.googleapis.com/v1beta/';
    const accounts = await pages(base + 'accountSummaries', token, 'accountSummaries');
    for (const account of accounts) for (const property of account.propertySummaries || []) {
      if (!/^properties\/\d+$/.test(property.property || '')) continue;
      const streams = await pages(base + property.property + '/dataStreams', token, 'dataStreams');
      options.push(...streams.map(s => analyticsOption(account, property, s)).filter(Boolean));
    }
  } else if (service === 'gtm') {
    const base = 'https://tagmanager.googleapis.com/tagmanager/v2/';
    for (const account of await pages(base + 'accounts', token, 'account')) {
      if (!/^accounts\/\d+$/.test(account.path || '')) continue;
      const containers = await pages(base + account.path + '/containers', token, 'container');
      options.push(...containers.map(c => containerOption(account, c)).filter(Boolean));
    }
  } else {
    const version = process.env.GOOGLE_ADS_API_VERSION || 'v25';
    if (!/^v\d+$/.test(version) || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) throw fail('Google Ads API ainda não foi habilitada pela Velo.', 503);
    const base = 'https://googleads.googleapis.com/' + version + '/';
    const headers = { 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN, 'Content-Type': 'application/json' };
    const accessible = await google(base + 'customers:listAccessibleCustomers', token, { headers });
    const search = async (customer, query, manager) => {
      const response = await google(base + 'customers/' + customer + '/googleAds:searchStream', token, { method: 'POST', headers: { ...headers, ...(manager ? { 'login-customer-id': manager } : {}) }, body: JSON.stringify({ query }) });
      return response.flatMap(batch => batch.results || []);
    };
    const seen = new Set();
    for (const resource of accessible.resourceNames || []) {
      const id = resource.match(/^customers\/(\d+)$/)?.[1];
      if (!id) continue;
      const account = (await search(id, 'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1'))[0]?.customer;
      if (!account) continue;
      const clients = account.manager ? (await search(id, 'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager FROM customer_client WHERE customer_client.manager = FALSE AND customer_client.status = ENABLED')).map(r => ({ id: String(r.customerClient.id), descriptiveName: r.customerClient.descriptiveName, manager: id })) : [{ ...account, id }];
      for (const client of clients) {
        if (!/^\d+$/.test(client.id) || seen.has(client.id)) continue;
        const rows = await search(client.id, 'SELECT conversion_action.resource_name, conversion_action.name, conversion_action.type, conversion_action.status, conversion_action.category, conversion_action.tag_snippets FROM conversion_action WHERE conversion_action.status = ENABLED AND conversion_action.type = WEBPAGE AND conversion_action.category = PURCHASE', client.manager);
        options.push(...rows.map(r => adsOption(client, r.conversionAction)).filter(Boolean));
        seen.add(client.id);
      }
    }
  }
  return options;
}
function refFor(db, state) {
  if (!statePattern.test(state || '')) throw fail('Sessão inválida.');
  return db.collection(sessions).doc(crypto.createHash('sha256').update(state).digest('hex'));
}
function readSession(snapshot, state) {
  if (!snapshot.exists) throw fail('Sessão expirada. Conecte novamente.', 410);
  const data = unseal(snapshot.data().payload, state);
  if (!Number.isFinite(data.expiresAt) || data.expiresAt < Date.now()) throw fail('Sessão expirada. Conecte novamente.', 410);
  return data;
}
// req.user is the Firebase ID token verified by the API. Grants are set by
// the operator in Vercel and are scoped to one store and Firebase UID.
export async function assertGoogleIntegrationAccess(user, storeId) {
  if (!user?.uid) throw fail('Login necessário.', 401);
  if (user.admin === true || user.superAdmin === true) return;
  const email = String(user.email || '').trim().toLowerCase();
  if (user.email_verified === true && ['appdedelivery@gmail.com', 'appdidelivery@gmail.com', 'projetosdiego.l@gmail.com'].includes(email)) return;
  const grants = JSON.parse(process.env.GOOGLE_CONNECT_STORE_UIDS || '{}');
  const authorized = Object.hasOwn(grants, storeId) && Array.isArray(grants[storeId]) && grants[storeId].includes(user.uid);
  if (!authorized) throw fail('Esta conta ainda não foi autorizada para as integrações desta loja.', 403);
}
export async function handleGoogleConnect(req, res, { db, assertStoreAccess }) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw fail('Método não permitido.', 405);
    const { action, storeId, service, state, optionId } = req.body || {};
    if (!req.user?.uid) throw fail('Acesso negado.', 401);
    if (!/^[a-z0-9][a-z0-9-]{0,100}$/.test(storeId || '') || !Object.hasOwn(scopes, service || '')) throw fail('Loja ou serviço inválido.');
    await assertStoreAccess(req.user, storeId);
    if (action === 'start') {
      key();
      const pilotStores = (process.env.GOOGLE_CONNECT_PILOT_STORES || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!pilotStores.includes('*') && !pilotStores.includes(storeId)) throw fail('Google Connect ainda não está disponível para esta loja. Use a configuração avançada.', 503);
      const redirectUri = callbackUri();
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw fail('OAuth Google não configurado na Velo.', 503);
      if (service === 'gads' && !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) throw fail('Google Ads API ainda não foi habilitada pela Velo.', 503);
      const state = 'velo_gc_' + crypto.randomBytes(32).toString('hex');
      const verifier = crypto.randomBytes(48).toString('base64url');
      const data = { uid: req.user.uid, storeId, service, verifier, redirectUri, expiresAt: Date.now() + ttl, status: 'pending' };
      await refFor(db, state).create({ payload: seal(data, state), expiresAt: new Date(data.expiresAt) });
      const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: scopes[service], access_type: 'offline', prompt: 'consent select_account', state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
      return res.status(200).json({ state, dryRun: isDryRun(), url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params });
    }
    const ref = refFor(db, state);
    const authorize = snap => {
      const data = readSession(snap, state);
      if (data.uid !== req.user.uid || data.storeId !== storeId || data.service !== service) throw fail('Acesso negado.', 403);
      return data;
    };
    if (action === 'status') {
      const data = authorize(await ref.get());
      return res.status(200).json({ status: data.status, error: data.error, options: data.options?.map(({ id, label }) => ({ id, label })) });
    }
    if (action === 'select') {
      await db.runTransaction(async transaction => {
        const data = authorize(await transaction.get(ref));
        if (data.status !== 'ready') throw fail('Autenticação não concluída.');
        const option = data.options.find(x => x.id === optionId);
        if (!option) throw fail('Seleção inválida.');
        // Homologação nunca altera rastreamento ou credenciais da loja real.
        if (isDryRun()) {
          transaction.delete(ref);
          return;
        }
        const settingsRef = db.collection('settings').doc(storeId);
        transaction.set(settingsRef, { integrations: { [service]: { ...option.config, authMode: 'oauth', resourceName: option.label, connectedAt: new Date() } } }, { merge: true });
        if (service === 'ga4') {
          const credentialRef = db.collection(credentials).doc(storeId + '_ga4');
          transaction.set(credentialRef, { payload: seal({ refreshToken: data.refreshToken, propertyId: option.config.measurementId }, storeId + '_ga4') });
        }
        transaction.delete(ref);
      });
      return res.status(200).json({ success: true, dryRun: isDryRun() });
    }
    throw fail('Ação inválida.');
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Não foi possível conectar ao Google. Tente novamente.' });
  }
}
export async function handleGoogleConnectCallback(req, res, db) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const { state, code, error } = req.query || {};
  let ref, data;
  try {
    ref = refFor(db, state);
    data = await db.runTransaction(async t => {
      const current = readSession(await t.get(ref), state);
      if (current.status !== 'pending') throw fail('Sessão já utilizada.');
      t.update(ref, { payload: seal({ ...current, status: 'processing' }, state) });
      return current;
    });
    if (error || !code) throw fail('Autorização cancelada ou recusada.');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: data.redirectUri, code, code_verifier: data.verifier, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(12000) });
    if (!tokenRes.ok) throw fail('O Google não concluiu a autorização.');
    const token = await tokenRes.json();
    if (!token.access_token || !String(token.scope || '').split(' ').includes(scopes[data.service])) throw fail('Permissão necessária não concedida.');
    if (data.service === 'ga4' && !token.refresh_token) throw fail('Não recebemos autorização permanente. Conecte novamente.');
    const options = await discover(data.service, token.access_token);
    if (!options.length) throw fail('Nenhum recurso compatível encontrado nessa conta Google.');
    await ref.update({ payload: seal({ ...data, verifier: null, status: 'ready', options, refreshToken: data.service === 'ga4' ? token.refresh_token : null }, state) });
    return res.status(200).send('Google autorizado. Volte para a aba da Velo Delivery e escolha o recurso. Pode fechar esta janela.');
  } catch (err) {
    if (ref && data) await ref.update({ payload: seal({ ...data, verifier: null, status: 'error', error: err.statusCode ? err.message : 'Falha ao consultar os recursos Google.' }, state) }).catch(() => {});
    return res.status(400).send('Não foi possível concluir a autorização. Volte para a aba da Velo Delivery.');
  }
}
export async function getConnectedAnalyticsToken(db, storeId, propertyId, user) {
  const settings = await db.collection('settings').doc(storeId).get();
  const ga4 = settings.data()?.integrations?.ga4;
  if (ga4?.authMode !== 'oauth') return null;
  await assertGoogleIntegrationAccess(user, storeId);
  if (String(ga4.measurementId) !== String(propertyId)) throw fail('Propriedade não autorizada para esta loja.', 403);
  const id = storeId + '_ga4';
  const credential = await db.collection(credentials).doc(id).get();
  if (!credential.exists) throw fail('Reconecte o Google Analytics.', 401);
  const data = unseal(credential.data().payload, id);
  if (String(data.propertyId) !== String(propertyId)) throw fail('Propriedade não autorizada.', 403);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: data.refreshToken, grant_type: 'refresh_token' }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw fail('Reconecte o Google Analytics.', 401);
  const token = await response.json();
  if (!token.access_token) throw fail('Reconecte o Google Analytics.', 401);
  return token.access_token;
}
