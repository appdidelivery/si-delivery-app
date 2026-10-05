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
const STORE_ID = 'csi';
const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_SECOND_PURCHASE_DAYS = 7;
const DEFAULT_SECOND_PURCHASE_MAX_AGE = 30;

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

async function sendTemplate({ waConfig, phone, templateCandidates, stage, sourceId, sourceType }) {
  const endpoint = `https://graph.facebook.com/v19.0/${waConfig.phoneNumberId}/messages`;
  const safePhone = `55${phone}`;
  let lastError = null;

  for (const templateName of templateCandidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waConfig.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: safePhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        lastError = data;
        console.warn(`[Journey CSI] Template ${templateName} indisponível:`, data?.error?.message || data);
        continue;
      }

      const metaMessageId = data.messages?.[0]?.id || null;
      await db.collection('whatsapp_inbound').add({
        storeId: STORE_ID,
        to: safePhone,
        text: `[Jornada Automática: ${stage}] Template oficial enviado: ${templateName}`,
        templateName,
        campaignType: 'journey_automation',
        journeyStage: stage,
        journeySourceId: sourceId || null,
        journeySourceType: sourceType || null,
        metaMessageId,
        deliveryStatus: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        direction: 'outbound',
      });

      return { ok: true, templateName, metaMessageId };
    } catch (error) {
      lastError = { error: { message: error.message } };
    }
  }

  return { ok: false, error: lastError };
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({ success: false, error: 'CRON_SECRET ausente.' });
  }

  if (req.headers['user-agent'] !== 'Vercel Cron' && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }

  try {
    const [storeDoc, settingsDoc] = await Promise.all([
      db.collection('stores').doc(STORE_ID).get(),
      db.collection('settings').doc(STORE_ID).get(),
    ]);

    if (!storeDoc.exists || !settingsDoc.exists) {
      return res.status(404).json({ success: false, error: 'CSI não configurada.' });
    }

    const storeData = storeDoc.data() || {};
    const settingsData = settingsDoc.data() || {};
    const waConfig = settingsData.integrations?.whatsapp;
    const config = waConfig?.journeyAutomation || {};

    if (!waConfig?.phoneNumberId || !waConfig?.apiToken) {
      return res.status(200).json({ success: true, skipped: true, reason: 'WhatsApp não configurado.' });
    }

    const dailyLimit = Math.max(1, Math.min(50, Number(config.dailyLimit) || DEFAULT_DAILY_LIMIT));
    const secondPurchaseAfterDays = Math.max(2, Math.min(30, Number(config.secondPurchaseAfterDays) || DEFAULT_SECOND_PURCHASE_DAYS));
    const secondPurchaseMaxAgeDays = Math.max(
      secondPurchaseAfterDays + 1,
      Math.min(60, Number(config.secondPurchaseMaxAgeDays) || DEFAULT_SECOND_PURCHASE_MAX_AGE),
    );

    const inboundSnap = await db.collection('whatsapp_inbound')
      .where('storeId', '==', STORE_ID)
      .limit(5000)
      .get();

    const relationshipPhones = new Set();
    inboundSnap.forEach((doc) => {
      const data = doc.data();
      if (data.direction === 'outbound') return;
      const phone = normalizePhone(data.from || data.phone);
      if (phone) relationshipPhones.add(phone);
    });

    const canReceiveMarketing = (phone, source = {}) =>
      relationshipPhones.has(phone) ||
      source.marketingOptIn === true ||
      source.whatsappMarketingOptIn === true;

    const summary = {
      dailyLimit,
      sentTotal: 0,
      abandoned_cart: { eligible: 0, sent: 0, skippedNoRelationship: 0 },
      post_sale: { eligible: 0, sent: 0, skippedNoRelationship: 0 },
      second_purchase: { eligible: 0, sent: 0, skippedNoRelationship: 0 },
    };

    const hasCapacity = () => summary.sentTotal < dailyLimit;

    // 1) Carrinho abandonado: 30+ minutos.
    const abandonedSnap = await db.collection('abandoned_carts')
      .where('status', '==', 'abandoned')
      .limit(1000)
      .get();

    for (const cartDoc of abandonedSnap.docs) {
      if (!hasCapacity()) break;
      const cart = cartDoc.data();
      if (cart.storeId !== STORE_ID) continue;
      if (cart.journeyAbandonedSent === true || cart.abandonmentAlertSent === true) continue;

      const cartAtMs = toMillis(cart.lastUpdated);
      if (!cartAtMs || Date.now() - cartAtMs < 30 * 60000) continue;

      const phone = normalizePhone(cart.customerPhone);
      if (!phone) continue;

      summary.abandoned_cart.eligible += 1;
      if (!canReceiveMarketing(phone, cart)) {
        summary.abandoned_cart.skippedNoRelationship += 1;
        continue;
      }

      const sent = await sendTemplate({
        waConfig,
        phone,
        templateCandidates: ['velo_carrinho_bebidas'],
        stage: 'abandoned_cart',
        sourceId: cartDoc.id,
        sourceType: 'abandoned_cart',
      });

      if (sent.ok) {
        await cartDoc.ref.set({
          journeyAbandonedSent: true,
          journeyAbandonedTemplate: sent.templateName,
          journeyAbandonedSentAt: admin.firestore.FieldValue.serverTimestamp(),
          abandonmentAlertSent: true,
        }, { merge: true });

        summary.abandoned_cart.sent += 1;
        summary.sentTotal += 1;
      }
    }

    // 2) Pedidos concluídos: pós-venda e segunda compra.
    const ordersSnap = await db.collection('orders')
      .where('storeId', '==', STORE_ID)
      .limit(5000)
      .get();

    const completedOrders = [];
    ordersSnap.forEach((orderDoc) => {
      const order = orderDoc.data();
      if (String(order.status || '').toLowerCase() !== 'completed') return;

      const phone = normalizePhone(order.customerPhone || order.customer?.phone);
      if (!phone) return;

      completedOrders.push({
        ref: orderDoc.ref,
        id: orderDoc.id,
        data: order,
        phone,
        orderAtMs: toMillis(order.completedAt || order.updatedAt || order.createdAt || order.paidAt),
      });
    });

    // Pós-venda: 30 minutos até 48 horas após a conclusão.
    for (const order of completedOrders) {
      if (!hasCapacity()) break;
      if (order.data.journeyPostSaleSent === true || order.data.postOrderAlertSent === true) continue;

      const ageMs = Date.now() - order.orderAtMs;
      if (!order.orderAtMs || ageMs < 30 * 60000 || ageMs > 48 * 3600000) continue;

      summary.post_sale.eligible += 1;
      if (!canReceiveMarketing(order.phone, order.data)) {
        summary.post_sale.skippedNoRelationship += 1;
        continue;
      }

      const sent = await sendTemplate({
        waConfig,
        phone: order.phone,
        // O print da Meta mostra o nome com prefixo "1_"; o segundo candidato
        // mantém compatibilidade caso o modelo seja recriado sem esse prefixo.
        templateCandidates: ['1_velo_pos_venda_bebidas', 'velo_pos_venda_bebidas'],
        stage: 'post_sale',
        sourceId: order.id,
        sourceType: 'order',
      });

      if (sent.ok) {
        await order.ref.set({
          journeyPostSaleSent: true,
          journeyPostSaleTemplate: sent.templateName,
          journeyPostSaleSentAt: admin.firestore.FieldValue.serverTimestamp(),
          postOrderAlertSent: true,
        }, { merge: true });

        summary.post_sale.sent += 1;
        summary.sentTotal += 1;
      }
    }

    const ordersByPhone = new Map();
    completedOrders.forEach((order) => {
      if (!ordersByPhone.has(order.phone)) ordersByPhone.set(order.phone, []);
      ordersByPhone.get(order.phone).push(order);
    });

    // Segunda compra: cliente com exatamente 1 pedido concluído e 7+ dias sem repetir.
    for (const [phone, customerOrders] of ordersByPhone.entries()) {
      if (!hasCapacity()) break;
      customerOrders.sort((a, b) => a.orderAtMs - b.orderAtMs);
      if (customerOrders.length !== 1) continue;

      const firstOrder = customerOrders[0];
      if (firstOrder.data.journeySecondPurchaseSent === true) continue;

      const daysSinceFirstOrder = Math.floor((Date.now() - firstOrder.orderAtMs) / 86400000);
      if (daysSinceFirstOrder < secondPurchaseAfterDays || daysSinceFirstOrder > secondPurchaseMaxAgeDays) continue;

      summary.second_purchase.eligible += 1;
      if (!canReceiveMarketing(phone, firstOrder.data)) {
        summary.second_purchase.skippedNoRelationship += 1;
        continue;
      }

      const sent = await sendTemplate({
        waConfig,
        phone,
        templateCandidates: ['velo_segunda_compra_bebidas'],
        stage: 'second_purchase',
        sourceId: firstOrder.id,
        sourceType: 'order',
      });

      if (sent.ok) {
        await firstOrder.ref.set({
          journeySecondPurchaseSent: true,
          journeySecondPurchaseTemplate: sent.templateName,
          journeySecondPurchaseSentAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        summary.second_purchase.sent += 1;
        summary.sentTotal += 1;
      }
    }

    await db.collection('analytics').add({
      storeId: STORE_ID,
      type: 'whatsapp_journey_cron',
      summary,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      storeName: storeData.name || 'Conveniência Santa Isabel',
    });

    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error('[Journey CSI] Falha geral:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
