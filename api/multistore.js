import admin from 'firebase-admin';
import { randomBytes, createHash } from 'node:crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    }),
  });
}

const db = admin.firestore();
const STORE_IDS = ['lovepicados', 'xisdale'];
const TTL_MS = 60 * 1000;
const MAX_BODY = 1024;

function domainFor(id) { return `${id}.velodelivery.com.br`; }
function getRequestStore(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  return STORE_IDS.find(id => host === domainFor(id)) || null;
}
async function permitted(uid, claims, id) {
  if (!STORE_IDS.includes(id)) return false;
  const snap = await db.collection('stores').doc(id).get();
  return snap.exists && (snap.data()?.ownerUid === uid || claims.admin === true || claims.superAdmin === true);
}
function bad(res, status, message) { return res.status(status).json({ error: message }); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return bad(res, 405, 'Método não permitido');
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) return bad(res, 413, 'Dados excedem limite');
  const currentStore = getRequestStore(req);
  if (!currentStore) return bad(res, 403, 'Domínio não autorizado para multiloja');
  const action = req.body?.action;

  try {
    if (action === 'redeem') {
      const raw = String(req.body?.ticket || '');
      if (!/^[0-9a-f]{64}$/.test(raw)) return bad(res, 400, 'Código inválido');
      const id = createHash('sha256').update(raw).digest('hex');
      const ref = db.collection('multistore_login_tickets').doc(id);
      const result = await db.runTransaction(async tx => {
        const ticket = await tx.get(ref);
        const value = ticket.data();
        if (!ticket.exists || value?.target !== currentStore || value?.used !== false ||
            typeof value?.expiresAtMs !== 'number' || Date.now() > value.expiresAtMs) return null;
        // Um ticket só pode ser usado uma vez; a transação impede corrida de resgates.
        tx.update(ref, { used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { uid: value.uid };
      });
      if (!result) return bad(res, 401, 'Código expirado ou já utilizado');
      const customToken = await admin.auth().createCustomToken(result.uid);
      return res.status(200).json({ customToken });
    }

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return bad(res, 401, 'Login necessário');
    const claims = await admin.auth().verifyIdToken(token, true);
    if (!(await permitted(claims.uid, claims, currentStore))) return bad(res, 403, 'Acesso não autorizado');

    if (action === 'list') {
      const allowed = await Promise.all(STORE_IDS.map(async id => (
        (await permitted(claims.uid, claims, id)) ? id : null
      )));
      return res.status(200).json({ stores: allowed.filter(Boolean) });
    }

    if (action === 'issue') {
      const target = String(req.body?.target || '');
      if (target === currentStore || !(await permitted(claims.uid, claims, target))) {
        return bad(res, 403, 'Destino não autorizado');
      }
      const ticket = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(ticket).digest('hex');
      await db.collection('multistore_login_tickets').doc(hash).create({
        uid: claims.uid, target, used: false, expiresAtMs: Date.now() + TTL_MS,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expireAt: admin.firestore.Timestamp.fromMillis(Date.now() + TTL_MS),
      });
      return res.status(200).json({
        url: `https://${domainFor(target)}/admin#multistore-ticket=${ticket}`
      });
    }
    return bad(res, 400, 'Operação desconhecida');
  } catch (error) {
    console.error('[MultiStore] operação falhou', error?.code || error?.message);
    return bad(res, 500, 'Não foi possível concluir a operação multiloja');
  }
}
