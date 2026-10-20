import crypto from 'node:crypto';

const VERSION = /^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION || '') ? process.env.META_GRAPH_VERSION : 'v25.0';
const digits = v => String(v || '').replace(/\D/g, '');
export const isWhatsAppId = v => /^\d{6,30}$/.test(String(v || ''));
export const validatePin = v => /^\d{6}$/.test(String(v || ''));
const appReady = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_WHATSAPP_CONFIG_ID);
const requireStore = async (req, db, storeId) => {
  if (!/^[a-zA-Z0-9_-]{1,70}$/.test(String(storeId || ''))) {
    const e = new Error('Loja inválida.'); e.statusCode = 400; throw e;
  }
  if (!req.user) { const e = new Error('Login necessário.'); e.statusCode = 401; throw e; }
  const email = String(req.user.email || '').toLowerCase();
  if (req.user.admin === true || req.user.superAdmin === true ||
      ['appdedelivery@gmail.com', 'appdidelivery@gmail.com', 'projetosdiego.l@gmail.com'].includes(email)) return;
  const doc = await db.collection('stores').doc(storeId).get();
  if (!doc.exists) { const e = new Error('Loja não encontrada.'); e.statusCode = 404; throw e; }
  const store = doc.data() || {};
  if (store.ownerUid === req.user.uid || (email && email === String(store.ownerEmail || store.email || '').toLowerCase())) return;
  const e = new Error('Apenas o titular da loja pode autorizar a conta WhatsApp.'); e.statusCode = 403; throw e;
};

const parseGraph = async response => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const err = new Error(String(result?.error?.error_user_msg || result?.error?.message || 'A Meta não concluiu a solicitação.').slice(0, 260));
    err.statusCode = response.status >= 400 && response.status < 500 ? 422 : 502;
    throw err;
  }
  return result;
};
const graph = async (endpoint, token, { method = 'GET', body = null } = {}) => {
  const headers = { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) };
  const proof = crypto.createHmac('sha256', process.env.META_APP_SECRET).update(token).digest('hex');
  const separator = endpoint.includes('?') ? '&' : '?';
  const res = await fetch('https://graph.facebook.com/' + VERSION + '/' + endpoint + separator + 'appsecret_proof=' + proof,
    { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  return parseGraph(res);
};
async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    code
  });
  const response = await fetch('https://graph.facebook.com/' + VERSION + '/oauth/access_token?' + params,
    { signal: AbortSignal.timeout(15000) });
  const result = await parseGraph(response);
  if (!result.access_token) throw new Error('A Meta não retornou token de integração.');
  return result.access_token;
}
async function debugToken(token) {
  const appAccess = process.env.META_APP_ID + '|' + process.env.META_APP_SECRET;
  const params = new URLSearchParams({ input_token: token });
  const response = await fetch('https://graph.facebook.com/' + VERSION + '/debug_token?' + params,
    { headers: { Authorization: 'Bearer ' + appAccess }, signal: AbortSignal.timeout(15000) });
  return (await parseGraph(response)).data || {};
}
function extractWabaId(debug, supplied) {
  const targetIds = new Set();
  (debug.granular_scopes || []).filter(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging')
    .flatMap(s => s.target_ids || []).forEach(id => targetIds.add(String(id)));
  if (supplied) {
    if (!isWhatsAppId(supplied)) throw new Error('ID da conta WhatsApp inválido.');
    if (targetIds.size > 0 && !targetIds.has(String(supplied))) throw new Error('A conta selecionada não está autorizada neste acesso.');
    return String(supplied);
  }
  if (targetIds.size !== 1) throw new Error('A Meta não identificou uma conta WhatsApp única. Refaça a autorização.');
  return [...targetIds][0];
}
export async function handleMetaWhatsAppSignup(req, res, { db, admin }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const { storeId, action } = req.body || {};
  try {
    await requireStore(req, db, storeId);
    const settingsRef = db.collection('settings').doc(storeId);
    const integration = (await settingsRef.get()).data()?.integrations || {};
    const whatsapp = integration.whatsapp || {};
    const active = Boolean(whatsapp.phoneNumberId && whatsapp.apiToken);
    const pending = integration.whatsappPending || null;
    if (action === 'status') {
      return res.json({
        success: true,
        ready: appReady() && Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
        appId: String(process.env.META_APP_ID || ''),
        configId: String(process.env.META_WHATSAPP_CONFIG_ID || ''),
        missing: [
          ...(!appReady() ? ['Configuração Embedded Signup no Meta Developers'] : []),
          ...(!process.env.META_WEBHOOK_VERIFY_TOKEN ? ['Token de verificação do webhook oficial'] : [])
        ],
        active, pending: !active && Boolean(pending?.phoneNumberId),
        provider: active ? 'meta' : null,
        phone: active ? whatsapp.displayPhoneNumber || '' : (pending?.displayPhoneNumber || ''),
        registration: active ? 'connected' : (pending?.phoneNumberId ? 'pin_required' : 'not_started'),
        coexistence: active ? whatsapp.coexistence === true : false
      });
    }
    if (!['complete', 'register'].includes(action)) return res.status(400).json({ error: 'Ação inválida.' });
    if (active) return res.status(409).json({ error: 'Esta loja já tem WhatsApp oficial ativo. A conexão existente foi preservada.' });
    if (!appReady() || !process.env.META_WEBHOOK_VERIFY_TOKEN)
      return res.status(503).json({ error: 'A integração oficial ainda não foi configurada no painel Meta e na Vercel.' });
    if (action === 'register') {
      if (!pending?.apiToken || !isWhatsAppId(pending.phoneNumberId))
        return res.status(409).json({ error: 'Não há cadastro aguardando registro nesta loja.' });
      if (!validatePin(req.body.pin))
        return res.status(400).json({ error: 'Informe um PIN de seis dígitos para a verificação em duas etapas.' });
      await graph(pending.phoneNumberId + '/register', pending.apiToken, {
        method: 'POST', body: { messaging_product: 'whatsapp', pin: String(req.body.pin) }
      });
      await settingsRef.set({ integrations: {
        whatsapp: {
          phoneNumberId: pending.phoneNumberId, apiToken: pending.apiToken, wabaId: pending.wabaId,
          displayPhoneNumber: pending.displayPhoneNumber || '', verifiedName: pending.verifiedName || '',
          provider: 'meta_embedded_signup', connectionMode: 'official', coexistence: false,
          healthStatus: 'healthy', connectedAt: admin.firestore.FieldValue.serverTimestamp(),
          backup_active: false
        }, whatsappPending: admin.firestore.FieldValue.delete()
      } }, { merge: true });
      return res.json({ success: true, active: true });
    }
    if (pending?.phoneNumberId) return res.status(409).json({ error: 'Esta loja já possui um número aguardando registro. Conclua essa etapa primeiro.' });
    const { code, wabaId, phoneNumberId, coexistence } = req.body;
    if (typeof code !== 'string' || code.length < 8 || code.length > 2500)
      return res.status(400).json({ error: 'Código de autorização da Meta inválido.' });
    if (phoneNumberId && !isWhatsAppId(phoneNumberId))
      return res.status(400).json({ error: 'Identificador do telefone inválido.' });

    const token = await exchangeCode(code);
    const debug = await debugToken(token);
    if (debug.is_valid !== true || String(debug.app_id) !== String(process.env.META_APP_ID)) {
      throw new Error('A autorização não pertence ao aplicativo da Velo.');
    }
    const granted = new Set([...(debug.scopes || []), ...(debug.granular_scopes || []).map(s => s.scope)]);
    if (!granted.has('whatsapp_business_management') || !granted.has('whatsapp_business_messaging'))
      throw new Error('A Meta não concedeu as permissões necessárias para mensagens e administração do WhatsApp.');
    const selectedWaba = extractWabaId(debug, wabaId);
    const numbers = await graph(selectedWaba + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=100', token);
    const matches = (numbers.data || []).filter(n => isWhatsAppId(n.id));
    const selectedPhone = phoneNumberId
      ? matches.find(n => String(n.id) === String(phoneNumberId))
      : matches.length === 1 ? matches[0] : null;
    if (!selectedPhone)
      throw new Error('Não foi possível identificar um único telefone autorizado. Conclua a escolha do número na Meta.');

    for (const field of ['integrations.whatsapp.phoneNumberId', 'integrations.whatsappPending.phoneNumberId']) {
      const snap = await db.collection('settings').where(field, '==', String(selectedPhone.id)).limit(2).get();
      if (snap.docs.some(doc => doc.id !== storeId))
        return res.status(409).json({ error: 'Este número já está associado a outra loja Velo.' });
    }

    // Webhook Meta já configurado para /api/whatsapp-webhook no app; vincular a nova WABA.
    await graph(selectedWaba + '/subscribed_apps', token, { method: 'POST' });

    const phoneMeta = {
      phoneNumberId: String(selectedPhone.id), apiToken: token, wabaId: selectedWaba,
      displayPhoneNumber: String(selectedPhone.display_phone_number || ''),
      verifiedName: String(selectedPhone.verified_name || ''),
      provider: 'meta_embedded_signup', connectionMode: 'official',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (coexistence === true) {
      await settingsRef.set({ integrations: { whatsapp: {
        ...phoneMeta, coexistence: true, healthStatus: 'healthy', backup_active: false,
        connectedAt: admin.firestore.FieldValue.serverTimestamp()
      } } }, { merge: true });
      return res.json({ success: true, active: true, coexistence: true, phone: phoneMeta.displayPhoneNumber });
    }
    await settingsRef.set({ integrations: { whatsappPending: { ...phoneMeta, coexistence: false } } }, { merge: true });
    return res.json({ success: true, active: false, registration: 'pin_required', phone: phoneMeta.displayPhoneNumber });
  } catch (err) {
    console.error('[Meta Embedded Signup]', { storeId, action, status: err.statusCode || 500, message: err.message });
    return res.status(err.statusCode || 502).json({ success: false, error: err.message || 'Erro ao vincular WhatsApp oficial.' });
  }
}
