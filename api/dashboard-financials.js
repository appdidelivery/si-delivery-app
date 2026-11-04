import admin from 'firebase-admin';
import { DAY_IN_MS, summarizeFinancialHistory } from '../lib/dashboardFinancials.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '')
    })
  });
}

const db = admin.firestore();
const PAGE_SIZE = 400;
const CACHE_DURATION_MS = 90 * 1000;
const cache = new Map();
const MASTER_EMAILS = new Set([
  'appdidelivery@gmail.com', 'appdedelivery@gmail.com', 'projetosdiego.l@gmail.com'
]);

async function authorizeStore(decoded, storeId) {
  if (decoded.admin === true || decoded.superAdmin === true) return true;
  const email = String(decoded.email || '').trim().toLowerCase();
  if (MASTER_EMAILS.has(email)) return true;

  const [userDoc, storeDoc] = await Promise.all([
    db.collection('users').doc(decoded.uid).get(),
    db.collection('stores').doc(storeId).get()
  ]);
  if (!storeDoc.exists) return false;
  const user = userDoc.data() || {};
  const store = storeDoc.data() || {};
  if (user.storeId === storeId || store.ownerUid === decoded.uid ||
    (email && email === String(store.ownerEmail || store.email || '').trim().toLowerCase())) return true;
  if (!email) return false;
  const memberQuery = await db.collection('team')
    .where('storeId', '==', storeId)
    .where('email', '==', email)
    .limit(1).get();
  if (memberQuery.empty) return false;
  const member = memberQuery.docs[0].data() || {};
  return member.active !== false && member.disabled !== true &&
    !['inactive', 'inativo', 'disabled', 'bloqueado'].includes(String(member.status || '').toLowerCase());
}

async function getHistoricalCounts(baseQuery) {
  const totalOrders = Number((await baseQuery.count().get()).data().count);
  let manualOrders = null;
  try {
    const results = await Promise.all(['manual', 'manual_pdv', 'whatsapp_pdv'].map(source =>
      baseQuery.where('source', '==', source).count().get()
    ));
    manualOrders = results.reduce((sum, snapshot) => sum + Number(snapshot.data().count), 0);
  } catch (error) {
    // Nunca substituir por um número inventado ou pelos últimos 800 pedidos.
    console.warn('[Dashboard financeiro] Contagem por origem indisponível:', error?.code || error?.message);
  }
  return {
    totalOrders,
    manualOrders,
    storefrontOrders: manualOrders === null ? null : Math.max(0, totalOrders - manualOrders)
  };
}

async function generateFinancialSnapshot(storeId) {
  const nowMs = Date.now();
  const cutoff = admin.firestore.Timestamp.fromMillis(nowMs - 365 * DAY_IN_MS);
  const base = db.collection('orders').where('storeId', '==', storeId);
  const countsPromise = getHistoricalCounts(base);
  const orders = [];
  let lastDocument = null;

  // Consulta paginada, sem limite de 800 e sem carregar o catálogo ou dados de clientes.
  for (;;) {
    let pageQuery = base
      .where('createdAt', '>=', cutoff)
      .orderBy('createdAt', 'desc')
      .select('createdAt', 'status', 'paymentStatus', 'paymentMethod', 'total', 'items')
      .limit(PAGE_SIZE);
    if (lastDocument) pageQuery = pageQuery.startAfter(lastDocument);

    const page = await pageQuery.get();
    for (const order of page.docs) orders.push(order.data());
    if (page.size < PAGE_SIZE) break;
    lastDocument = page.docs[page.docs.length - 1];
  }

  const counts = await countsPromise;
  return {
    success: true,
    storeId,
    counts,
    periods: summarizeFinancialHistory(orders, nowMs),
    generatedAt: new Date(nowMs).toISOString(),
    historyWindowDays: 365,
    scannedOrdersInWindow: orders.length
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const storeId = String(req.body?.storeId || '').trim();
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(storeId)) {
    return res.status(400).json({ error: 'Loja inválida.' });
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'É necessário entrar na conta.' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (!(await authorizeStore(decoded, storeId))) {
      return res.status(403).json({ error: 'Acesso negado à loja.' });
    }

    const cached = cache.get(storeId);
    if (req.body?.forceRefresh !== true && cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
      return res.status(200).json(cached.data);
    }

    const data = await generateFinancialSnapshot(storeId);
    cache.set(storeId, { cachedAt: Date.now(), data });
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Dashboard financeiro] Falha ao apurar histórico:', error?.code || error?.message);
    return res.status(error?.code?.startsWith('auth/') ? 401 : 500)
      .json({ error: 'Falha ao consultar o histórico financeiro completo. Tente atualizar o painel.' });
  }
}
