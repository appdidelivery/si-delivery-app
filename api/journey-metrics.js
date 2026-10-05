import admin from 'firebase-admin';

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

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits.length === 11 ? digits : null;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return Number(value.seconds) * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function assertStoreAccess(user, storeId) {
  if (!user || !storeId) throw Object.assign(new Error('Acesso inválido.'), { statusCode: 401 });
  if (user.admin === true || user.superAdmin === true) return;

  const callerEmail = String(user.email || '').trim().toLowerCase();
  const platformAdminEmails = new Set([
    'appdedelivery@gmail.com',
    'appdidelivery@gmail.com',
    'projetosdiego.l@gmail.com',
  ]);
  if (callerEmail && platformAdminEmails.has(callerEmail)) return;

  const [userDoc, storeDoc] = await Promise.all([
    db.collection('users').doc(user.uid).get(),
    db.collection('stores').doc(storeId).get(),
  ]);

  const userData = userDoc.exists ? userDoc.data() : {};
  const storeData = storeDoc.exists ? storeDoc.data() : {};
  const ownerEmail = String(storeData.ownerEmail || storeData.email || '').trim().toLowerCase();

  if (
    userData.storeId === storeId ||
    storeData.ownerUid === user.uid ||
    (callerEmail && ownerEmail && callerEmail === ownerEmail)
  ) return;

  if (callerEmail) {
    const teamSnap = await db.collection('team')
      .where('storeId', '==', storeId)
      .where('email', '==', callerEmail)
      .limit(1)
      .get();

    if (!teamSnap.empty) {
      const teamData = teamSnap.docs[0].data() || {};
      const inactive =
        teamData.active === false ||
        teamData.disabled === true ||
        ['inactive', 'inativo', 'disabled', 'bloqueado'].includes(String(teamData.status || '').toLowerCase());
      if (!inactive) return;
    }
  }

  throw Object.assign(new Error('Usuário sem acesso a esta loja.'), { statusCode: 403 });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Método não permitido.' });

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token ausente.' });
  }

  let user;
  try {
    user = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado.' });
  }

  const storeId = String(req.query?.storeId || '').trim();
  const attributionDays = Math.max(1, Math.min(30, Number(req.query?.attributionDays) || 7));

  try {
    await assertStoreAccess(user, storeId);

    const windowMs = attributionDays * 86400000;
    const [messagesSnap, ordersSnap] = await Promise.all([
      db.collection('whatsapp_inbound').where('storeId', '==', storeId).limit(5000).get(),
      db.collection('orders').where('storeId', '==', storeId).limit(5000).get(),
    ]);

    const stageLabels = {
      abandoned_cart: 'Carrinho',
      post_sale: 'Pós-venda',
      second_purchase: '2ª compra',
    };
    const stageKeys = Object.keys(stageLabels);
    const makeStage = (stage) => ({
      stage,
      label: stageLabels[stage],
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      responded: 0,
      convertedCustomers: 0,
      attributedOrders: 0,
      attributedRevenue: 0,
      deliveryRate: 0,
      readRate: 0,
      responseRate: 0,
      conversionRate: 0,
    });

    const stages = Object.fromEntries(stageKeys.map((stage) => [stage, makeStage(stage)]));
    const inboundByPhone = new Map();
    const eventsByPhone = new Map();

    messagesSnap.forEach((doc) => {
      const data = doc.data();
      const direction = data.direction;
      const phone = normalizePhone(direction === 'outbound' ? data.to : data.from);
      const atMs = toMillis(data.sentAt || data.receivedAt || data.deliveryUpdatedAt);
      if (!phone || !atMs) return;

      if (direction !== 'outbound') {
        if (!inboundByPhone.has(phone)) inboundByPhone.set(phone, []);
        inboundByPhone.get(phone).push(atMs);
        return;
      }

      if (data.campaignType !== 'journey_automation') return;
      const stage = String(data.journeyStage || '');
      if (!stageKeys.includes(stage)) return;

      if (!eventsByPhone.has(phone)) eventsByPhone.set(phone, []);
      eventsByPhone.get(phone).push({ stage, atMs });

      const bucket = stages[stage];
      const status = String(data.deliveryStatus || 'sent').toLowerCase();
      bucket.sent += 1;
      if (['delivered', 'read'].includes(status)) bucket.delivered += 1;
      if (status === 'read') bucket.read += 1;
      if (status === 'failed') bucket.failed += 1;
    });

    inboundByPhone.forEach((list) => list.sort((a, b) => a - b));
    eventsByPhone.forEach((list) => list.sort((a, b) => a.atMs - b.atMs));

    for (const [phone, events] of eventsByPhone.entries()) {
      const replies = inboundByPhone.get(phone) || [];
      events.forEach((event) => {
        if (replies.some((replyAtMs) => replyAtMs > event.atMs && replyAtMs <= event.atMs + windowMs)) {
          stages[event.stage].responded += 1;
        }
      });
    }

    const convertedByStage = Object.fromEntries(stageKeys.map((stage) => [stage, new Set()]));
    const canceled = new Set(['canceled', 'cancelado', 'cancelled', 'refunded', 'estornado']);

    ordersSnap.forEach((doc) => {
      const order = doc.data();
      if (canceled.has(String(order.status || '').toLowerCase())) return;

      const phone = normalizePhone(order.customerPhone || order.customer?.phone);
      const orderAtMs = toMillis(order.createdAt || order.paidAt);
      if (!phone || !orderAtMs) return;

      const events = eventsByPhone.get(phone) || [];
      let attributed = null;

      for (let i = events.length - 1; i >= 0; i -= 1) {
        const event = events[i];
        if (event.atMs > orderAtMs) continue;
        const delta = orderAtMs - event.atMs;
        if (delta <= windowMs) {
          attributed = event;
          break;
        }
        if (delta > windowMs) break;
      }

      if (!attributed) return;

      const bucket = stages[attributed.stage];
      bucket.attributedOrders += 1;
      bucket.attributedRevenue += Number(order.total ?? order.totalAmount ?? order.amount ?? 0) || 0;
      convertedByStage[attributed.stage].add(phone);
    });

    stageKeys.forEach((stage) => {
      const bucket = stages[stage];
      bucket.convertedCustomers = convertedByStage[stage].size;
      bucket.attributedRevenue = Number(bucket.attributedRevenue.toFixed(2));
      bucket.deliveryRate = bucket.sent ? Number(((bucket.delivered / bucket.sent) * 100).toFixed(1)) : 0;
      bucket.readRate = bucket.sent ? Number(((bucket.read / bucket.sent) * 100).toFixed(1)) : 0;
      bucket.responseRate = bucket.sent ? Number(((bucket.responded / bucket.sent) * 100).toFixed(1)) : 0;
      bucket.conversionRate = bucket.sent ? Number(((bucket.convertedCustomers / bucket.sent) * 100).toFixed(1)) : 0;
    });

    const overall = stageKeys.reduce((acc, stage) => {
      const bucket = stages[stage];
      acc.sent += bucket.sent;
      acc.delivered += bucket.delivered;
      acc.read += bucket.read;
      acc.failed += bucket.failed;
      acc.responded += bucket.responded;
      acc.convertedCustomers += bucket.convertedCustomers;
      acc.attributedOrders += bucket.attributedOrders;
      acc.attributedRevenue += bucket.attributedRevenue;
      return acc;
    }, {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      responded: 0,
      convertedCustomers: 0,
      attributedOrders: 0,
      attributedRevenue: 0,
    });

    overall.attributedRevenue = Number(overall.attributedRevenue.toFixed(2));
    overall.deliveryRate = overall.sent ? Number(((overall.delivered / overall.sent) * 100).toFixed(1)) : 0;
    overall.readRate = overall.sent ? Number(((overall.read / overall.sent) * 100).toFixed(1)) : 0;
    overall.responseRate = overall.sent ? Number(((overall.responded / overall.sent) * 100).toFixed(1)) : 0;
    overall.conversionRate = overall.sent ? Number(((overall.convertedCustomers / overall.sent) * 100).toFixed(1)) : 0;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({
      success: true,
      storeId,
      attributionDays,
      overall,
      stages,
      clickTrackingAvailable: false,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
}
