import crypto from 'crypto';

// Serviço de sessões WhatsApp por QR: isolado da Cloud API.
const instanceFor = storeId => 'velo_' + storeId;
const sign = (storeId, secret) => crypto.createHmac('sha256', secret).update('velo-qr-webhook:' + storeId).digest('hex');
const numberOnly = value => String(value || '').replace(/\D/g, '');
const isOpen = data => data?.instance?.state === 'open' || data?.state === 'open';
const getConfig = () => {
  const url = process.env.EVOLUTION_API_URL?.trim()?.replace(/\/+$/, '');
  const key = process.env.EVOLUTION_GLOBAL_API_KEY?.trim();
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) return null;
  return { baseUrl: parsed.toString().replace(/\/+$/, ''), key };
};
const evoCall = async (cfg, path, method = 'GET', body) => {
  const response = await fetch(cfg.baseUrl + path, {
    method,
    headers: { apikey: cfg.key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 300) }; }
  if (!response.ok) {
    const err = new Error('Servidor WhatsApp retornou ' + response.status + ': ' + String(data.message || data.error || 'falha de conexão').slice(0, 150));
    err.statusCode = response.status;
    throw err;
  }
  return data;
};
const extractQr = data => {
  const code = data?.qrcode?.base64 || data?.base64 || data?.instance?.qrcode?.base64;
  if (typeof code !== 'string' || code.length < 120) return null;
  const b64 = code.startsWith('data:image/') ? code : 'data:image/png;base64,' + code;
  return b64.slice(0, 250000);
};
async function ensureSetupAccess(user, storeId, db, assertStoreAccess) {
  if (!/^[a-zA-Z0-9_-]{1,70}$/.test(String(storeId || ''))) {
    const err = new Error('Identificador de loja inválido.'); err.statusCode = 400; throw err;
  }
  await assertStoreAccess(user, storeId);
  const callerEmail = String(user?.email || '').toLowerCase();
  if (user?.admin || user?.superAdmin ||
    ['appdedelivery@gmail.com', 'appdidelivery@gmail.com', 'projetosdiego.l@gmail.com'].includes(callerEmail)) return;
  const storeDoc = await db.collection('stores').doc(storeId).get();
  const store = storeDoc.data() || {};
  if (store.ownerUid === user.uid || String(store.ownerEmail || store.email || '').toLowerCase() === callerEmail) return;
  const team = await db.collection('team').where('storeId', '==', storeId).where('email', '==', callerEmail).limit(1).get();
  const member = team.docs[0]?.data();
  if (member && member.active !== false && member.disabled !== true && member.permissions?.integrations === true) return;
  const err = new Error('Somente titular ou equipe autorizada pode conectar o WhatsApp.');
  err.statusCode = 403; throw err;
}
export async function handleWhatsAppQrManager(req, res, { db, admin, assertStoreAccess }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const { storeId, action } = req.body || {};
  try {
    await ensureSetupAccess(req.user, storeId, db, assertStoreAccess);
    const config = getConfig();
    const settingsRef = db.collection('settings').doc(storeId);
    const wa = (await settingsRef.get()).data()?.integrations?.whatsapp || {};
    const officialActive = !!(wa.phoneNumberId && wa.apiToken);
    if (action === 'availability') return res.json({
      success: true, enabled: !!config, officialActive, connectedMode: officialActive ? 'official' : (wa.connectionMode || 'none')
    });
    if (!['create', 'qr', 'status', 'disconnect'].includes(action)) return res.status(400).json({ error: 'Ação inválida.' });
    if (officialActive) return res.status(409).json({ error: 'A loja possui API Oficial. Para migrar, faça um procedimento assistido; a sessão atual não será alterada.' });
    if (!config) return res.status(503).json({ error: 'Conexão por QR ainda não habilitada. Configure EVOLUTION_API_URL e EVOLUTION_GLOBAL_API_KEY na Vercel e a instância na VPS.' });
    const instance = instanceFor(storeId);
    if (action === 'create') {
      // O identificador por loja impede que uma loja crie ou controle instâncias de outra.
      let data;
      try {
        data = await evoCall(config, '/instance/create', 'POST', {
          instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS',
          webhook: qrWebhookAddress(storeId), webhookByEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
        });
      } catch (err) {
        if (!/already exists|já existe|already in use|409/i.test(err.message)) throw err;
        data = {};
      }
      // Garante que a VPS entregue as mensagens ao chat da loja, inclusive quando a instância já existia.
      const hook = qrWebhookAddress(storeId);
      await evoCall(config, '/webhook/set/' + instance, 'POST', {
        webhook: { enabled: true, url: hook, webhookByEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] }
      });
      const qr = extractQr(data);
      return res.json({ success: true, connected: false, qr, next: qr ? 'scan' : 'qr' });
    }
    if (action === 'disconnect') {
      // Desvinculação deve ser explícita. Não tocar em credenciais da API Oficial.
      await evoCall(config, '/instance/logout/' + instance, 'DELETE').catch(() => {});
      await evoCall(config, '/instance/delete/' + instance, 'DELETE');
      await settingsRef.set({ integrations: { whatsapp: { connectionMode: admin.firestore.FieldValue.delete(), backup_active: false } } }, { merge: true });
      return res.json({ success: true, connected: false });
    }
    let state = {};
    try { state = await evoCall(config, '/instance/connectionState/' + instance); } catch (err) {
      if (err.statusCode !== 404) throw err;
      return res.json({ success: true, connected: false, needsCreate: true });
    }
    if (isOpen(state)) {
      if (wa.connectionMode !== 'qr') {
        await settingsRef.set({ integrations: { whatsapp: { connectionMode: 'qr', backup_active: false } } }, { merge: true });
      }
      return res.json({ success: true, connected: true, state: 'open' });
    }
    if (action === 'status') return res.json({ success: true, connected: false, state: 'disconnected' });
    const qrResponse = await evoCall(config, '/instance/connect/' + instance);
    return res.json({ success: true, connected: false, qr: extractQr(qrResponse), state: 'waiting' });
  } catch (error) {
    console.error('[Velo QR] Gerenciador:', error.message);
    return res.status(error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503)
      .json({ success: false, error: error.message || 'Falha na conexão por QR.' });
  }
}
export async function handleWhatsAppQrWebhook(req, res, { db, admin }) {
  if (req.method !== 'POST') return res.status(405).end();
  const storeId = String(req.query?.storeId || '');
  const supplied = String(req.query?.sig || '');
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_GLOBAL_API_KEY;
  if (!/^[a-zA-Z0-9_-]{1,70}$/.test(storeId) || !secret || !/^[a-f0-9]{64}$/.test(supplied)) {
    return res.status(403).end();
  }
  const expected = sign(storeId, secret);
  if (!crypto.timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) return res.status(403).end();
  const body = req.body || {};
  if (String(body.instance || body.instanceName || '') !== instanceFor(storeId)) return res.status(403).end();
  const wa = (await db.collection('settings').doc(storeId).get()).data()?.integrations?.whatsapp || {};
  if (wa.connectionMode !== 'qr') return res.status(200).json({ ignored: true });
  const event = String(body.event || '').toLowerCase().replace(/\./g, '_');
  if (!event.includes('messages_upsert')) return res.status(200).json({ success: true });
  const messages = Array.isArray(body.data) ? body.data : [body.data];
  let saved = 0;
  for (const entry of messages.slice(0, 50)) {
    const key = entry?.key || {};
    if (key.fromMe === true) continue;
    const jid = String(key.remoteJid || '');
    if (!jid.endsWith('@s.whatsapp.net')) continue; // sem grupos ou status
    const rawPhone = numberOnly(jid.split('@')[0]);
    if (rawPhone.length < 10 || rawPhone.length > 13) continue;
    const messageId = String(key.id || '');
    if (!messageId) continue;
    const withoutCountry = rawPhone.startsWith('55') ? rawPhone.substring(2) : rawPhone;
    const blockedDoc = await db.collection('blocked_contacts').doc(storeId + '_' + withoutCountry).get();
    if (blockedDoc.exists) continue;
    const m = entry.message || {};
    const text = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
    const mediaType = m.imageMessage ? 'image' : m.videoMessage ? 'video' : m.audioMessage ? 'audio' : m.documentMessage ? 'document' : null;
    const cleanText = text || (mediaType ? '[Mídia recebida - abra no WhatsApp]' : '[Mensagem recebida]');
    const dedupeId = crypto.createHash('sha256').update(storeId + ':' + messageId).digest('hex');
    const record = db.collection('whatsapp_inbound').doc('qr_' + dedupeId);
    const already = await record.get();
    if (already.exists) continue;
    await record.create({
      storeId, from: rawPhone, pushName: String(entry.pushName || '').slice(0, 120),
      text: String(cleanText).slice(0, 5000), mediaType: mediaType || '',
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'unread', direction: 'inbound', provider: 'evolution_qr', providerMessageId: messageId
    }).catch(err => { if (err.code !== 6) throw err; });
    saved++;
  }
  return res.json({ success: true, saved });
}
export async function sendWhatsAppQrReply({ storeId, toPhone, text }) {
  const cfg = getConfig();
  if (!cfg) return { success: false, error: 'Canal QR indisponível.' };
  const phone = numberOnly(toPhone);
  if (phone.length < 12 || phone.length > 13 || !text || text.length > 4000) {
    return { success: false, error: 'Número ou texto inválido.' };
  }
  try {
    const response = await evoCall(cfg, '/message/sendText/' + instanceFor(storeId), 'POST', { number: phone, text });
    return { success: true, message_id: response?.key?.id || null };
  } catch (err) { return { success: false, error: err.message }; }
}
export function qrWebhookAddress(storeId) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_GLOBAL_API_KEY;
  return secret ? 'https://app.velodelivery.com.br/api/whatsapp-qr-webhook?storeId=' + encodeURIComponent(storeId) + '&sig=' + sign(storeId, secret) : null;
}
