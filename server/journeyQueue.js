import { marketingMessagesEndpoint } from '../lib/whatsappMarketingGraph.js';
import { hasAuthorizedCsiMarketingConsent } from '../lib/csiMarketingEligibility.js';
import { normalizeWhatsAppReplyRecipient } from '../lib/whatsappReplyRecipient.js';
import { secondPurchasePolicy, evaluateCsiSecondPurchase } from '../lib/csiSecondPurchaseEligibility.js';
import admin from 'firebase-admin';
import { QueueClient, send } from '@vercel/queue';
import { hasEligibleMarketingConsent, isMarketingOptedOut, reserveMarketingAttempt, getAutomationDailyLimit } from '../lib/whatsappMarketingGuard.js';

export const JOURNEY_TOPIC = 'velo-whatsapp-journey';
export const CSI_STORE_ID = 'csi';

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
const queue = new QueueClient();

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

async function enqueueJourney(payload, options = {}) {
  const delaySeconds = Math.max(0, Math.min(604800, Number(options.delaySeconds) || 0));
  const retentionSeconds = Math.max(
    60,
    Math.min(604800, Number(options.retentionSeconds) || Math.max(delaySeconds + 3600, 86400)),
  );

  return send(JOURNEY_TOPIC, payload, {
    delaySeconds,
    retentionSeconds,
    idempotencyKey: options.idempotencyKey,
  });
}

async function canReceiveJourneyMarketing(phone, source = {}) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const consentSnap = await db.collection('whatsapp_marketing_consents')
    .doc(`${CSI_STORE_ID}_${normalized}`).get();
  if (!hasAuthorizedCsiMarketingConsent(source, consentSnap.data())) return false;
  const blockedSnap = await db.collection('blocked_contacts').doc(`${CSI_STORE_ID}_${normalized}`).get();
  return !blockedSnap.exists;
}

async function sendJourneyTemplate({ phone, templateCandidates, stage, sourceId, sourceType }) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, reason: 'invalid_phone' };
  if (await isMarketingOptedOut(db, CSI_STORE_ID, normalized)) {
    return { ok: false, reason: 'unsubscribed' };
  }

  const settingsDoc = await db.collection('settings').doc(CSI_STORE_ID).get();
  const waConfig = settingsDoc.data()?.integrations?.whatsapp;
  if (waConfig?.journeyAutomation?.enabled !== true) {
    return { ok: false, reason: 'journey_disabled' };
  }
  if (!waConfig?.phoneNumberId || !waConfig?.apiToken) {
    throw new Error('WhatsApp oficial da CSI não configurado.');
  }

  // Respeita o piloto de 10/dia quando ativado no painel; não usa teto fixo 20.
  const journeyDailyLimit = getAutomationDailyLimit(waConfig.journeyAutomation.dailyLimit);
  const reserved = await reserveMarketingAttempt(db, {
    storeId: CSI_STORE_ID, phone: normalized, type: stage, dailyLimit: journeyDailyLimit
  });
  if (!reserved.allowed) return { ok: false, reason: reserved.reason };

  const endpoint = marketingMessagesEndpoint(waConfig.phoneNumberId);
  // A chave de elegibilidade pode normalizar o telefone para busca, mas o
  // destinatário da Meta preserva os dígitos realmente informados pelo cliente.
  const safePhone = normalizeWhatsAppReplyRecipient(phone);
  if (!safePhone) return { ok: false, reason: 'invalid_meta_recipient' };
  let lastError = null;

  for (const templateName of templateCandidates) {
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

    const metaData = await response.json();
    if (!response.ok) {
      lastError = metaData;
      continue;
    }

    const metaMessageId = metaData.messages?.[0]?.id || null;

    await db.collection('whatsapp_inbound').add({
      storeId: CSI_STORE_ID,
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
  }

  throw new Error(lastError?.error?.message || 'Meta recusou o template da jornada.');
}

async function processJourneyMessage(message) {
  if (!message || message.storeId !== CSI_STORE_ID || !message.sourceId) return;

  if (message.type === 'abandoned_cart') {
    const cartRef = db.collection('abandoned_carts').doc(String(message.sourceId));
    const cartSnap = await cartRef.get();
    if (!cartSnap.exists) return;

    const cart = cartSnap.data() || {};
    if (
      cart.storeId !== CSI_STORE_ID ||
      cart.status !== 'abandoned' ||
      cart.journeyAbandonedSent === true ||
      cart.abandonmentAlertSent === true
    ) return;

    const lastUpdatedMs = toMillis(cart.lastUpdated);
    if (!lastUpdatedMs) return;

    const remainingMs = (lastUpdatedMs + 30 * 60 * 1000) - Date.now();
    if (remainingMs > 1000) {
      const bucket = Math.floor(lastUpdatedMs / (5 * 60 * 1000));
      await enqueueJourney(message, {
        delaySeconds: Math.ceil(remainingMs / 1000),
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:cart-recheck:${message.sourceId}:${bucket}`,
      });
      return;
    }

    const phone = normalizePhone(cart.customerPhone);
    if (!phone || !(await canReceiveJourneyMarketing(phone, cart))) return;

    const sent = await sendJourneyTemplate({
      phone: cart.customerPhone,
      templateCandidates: ['velo_carrinho_bebidas'],
      stage: 'abandoned_cart',
      sourceId: cartSnap.id,
      sourceType: 'abandoned_cart',
    });

    if (sent.ok) {
      await cartRef.set({
        journeyAbandonedSent: true,
        journeyAbandonedTemplate: sent.templateName,
        journeyAbandonedMetaMessageId: sent.metaMessageId,
        journeyAbandonedSentAt: admin.firestore.FieldValue.serverTimestamp(),
        abandonmentAlertSent: true,
      }, { merge: true });
    }
    return;
  }

  if (message.type === 'post_sale') {
    const orderRef = db.collection('orders').doc(String(message.sourceId));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return;

    const order = orderSnap.data() || {};
    if (
      order.storeId !== CSI_STORE_ID ||
      String(order.status || '').toLowerCase() !== 'completed' ||
      order.journeyPostSaleSent === true
    ) return;

    const completedAtMs = toMillis(order.completedAt || order.updatedAt || order.createdAt);
    if (!completedAtMs) return;

    const remainingMs = (completedAtMs + 30 * 60 * 1000) - Date.now();
    if (remainingMs > 1000) {
      await enqueueJourney(message, {
        delaySeconds: Math.ceil(remainingMs / 1000),
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:post-sale-recheck:${message.sourceId}`,
      });
      return;
    }

    const phone = normalizePhone(order.customerPhone || order.customer?.phone);
    if (!phone || !(await canReceiveJourneyMarketing(phone, order))) return;

    const sent = await sendJourneyTemplate({
      phone: order.customerPhone || order.customer?.phone,
      templateCandidates: ['1_velo_pos_venda_bebidas', 'velo_pos_venda_bebidas'],
      stage: 'post_sale',
      sourceId: orderSnap.id,
      sourceType: 'order',
    });

    if (sent.ok) {
      await orderRef.set({
        journeyPostSaleSent: true,
        journeyPostSaleTemplate: sent.templateName,
        journeyPostSaleMetaMessageId: sent.metaMessageId,
        journeyPostSaleSentAt: admin.firestore.FieldValue.serverTimestamp(),
        postOrderAlertSent: true,
      }, { merge: true });
    }
    return;
  }

  if (message.type === 'second_purchase') {
    const orderRef = db.collection('orders').doc(String(message.sourceId));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return;
    const order = orderSnap.data() || {};
    if (order.storeId !== CSI_STORE_ID || order.journeySecondPurchaseSent === true) return;

    const settingsDoc = await db.collection('settings').doc(CSI_STORE_ID).get();
    const policy = secondPurchasePolicy(settingsDoc.data()?.integrations?.whatsapp?.journeyAutomation || {});
    const ordersSnap = await db.collection('orders').where('storeId', '==', CSI_STORE_ID).limit(5000).get();
    // An incomplete order sample must not trigger unsolicited messages.
    if (ordersSnap.size >= 5000) {
      console.warn('[Second Purchase] order scan reached safety limit; not sending.');
      return;
    }
    const decision = evaluateCsiSecondPurchase({
      sourceId: orderSnap.id, order,
      otherOrders: ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      nowMs: Date.now(), ...policy,
    });
    if (decision.reason === 'not_due') {
      const bucket = Math.floor(Date.now() / (6 * 3600000));
      await enqueueJourney(message, {
        delaySeconds: Math.max(1, Math.min(604800, Math.ceil(decision.remainingMs / 1000))),
        retentionSeconds: 604800,
        idempotencyKey: `csi:second-purchase-recheck:${orderSnap.id}:${bucket}`,
      });
      return;
    }
    if (!decision.allowed) return;
    if (!(await canReceiveJourneyMarketing(decision.phone, order))) return;
    const sent = await sendJourneyTemplate({
      phone: order.customerPhone || order.customer?.phone,
      templateCandidates: ['velo_segunda_compra_bebidas'],
      stage: 'second_purchase',
      sourceId: orderSnap.id,
      sourceType: 'order',
    });
    if (sent.ok) {
      await orderRef.set({
        journeySecondPurchaseSent: true,
        journeySecondPurchaseTemplate: sent.templateName,
        journeySecondPurchaseMetaMessageId: sent.metaMessageId,
        journeySecondPurchaseSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
}

export const journeyQueueNodeHandler = queue.handleNodeCallback(
  async (message, metadata) => {
    try {
      await processJourneyMessage(message);
    } catch (error) {
      console.error('[Journey Queue]', metadata?.messageId, error);
      throw error;
    }
  },
  {
    visibilityTimeoutSeconds: 120,
    retry: (error, metadata) => {
      if (metadata?.deliveryCount > 8) return { acknowledge: true };
      return { afterSeconds: Math.min(300, 30 * Math.max(1, metadata?.deliveryCount || 1)) };
    },
  },
);

export async function scheduleJourneyRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  const { storeId, type, sourceId } = req.body || {};
  if (storeId !== CSI_STORE_ID || !sourceId) {
    return res.status(400).json({ success: false, error: 'Solicitação inválida.' });
  }

  if (type === 'abandoned_cart') {
    const cartRef = db.collection('abandoned_carts').doc(String(sourceId));
    const cartSnap = await cartRef.get();
    if (!cartSnap.exists) return res.status(404).json({ success: false, error: 'Carrinho não encontrado.' });

    const cart = cartSnap.data() || {};
    if (cart.storeId !== CSI_STORE_ID || cart.status !== 'abandoned' || cart.journeyAbandonedSent === true) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const lastUpdatedMs = toMillis(cart.lastUpdated) || Date.now();
    const delaySeconds = Math.max(1, Math.ceil(((lastUpdatedMs + 30 * 60 * 1000) - Date.now()) / 1000));
    const bucket = Math.floor(lastUpdatedMs / (5 * 60 * 1000));

    const result = await enqueueJourney(
      { type: 'abandoned_cart', storeId, sourceId: String(sourceId) },
      {
        delaySeconds,
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:cart:${sourceId}:${bucket}`,
      },
    );

    return res.status(200).json({
      success: true,
      queued: true,
      messageId: result.messageId,
      delaySeconds,
    });
  }

  if (type === 'post_sale') {
    const orderRef = db.collection('orders').doc(String(sourceId));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

    const order = orderSnap.data() || {};
    if (
      order.storeId !== CSI_STORE_ID ||
      String(order.status || '').toLowerCase() !== 'completed' ||
      order.journeyPostSaleSent === true
    ) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const completedAtMs = toMillis(order.completedAt) || Date.now();
    const delaySeconds = Math.max(1, Math.ceil(((completedAtMs + 30 * 60 * 1000) - Date.now()) / 1000));

    const result = await enqueueJourney(
      { type: 'post_sale', storeId, sourceId: String(sourceId) },
      {
        delaySeconds,
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:post-sale:${sourceId}`,
      },
    );

    // Agenda a segunda compra apenas para pedidos concluídos novos,
    // sem varredura/disparo retroativo em contatos antigos.
    const settingsSnap = await db.collection('settings').doc(CSI_STORE_ID).get();
    const secondPolicy = secondPurchasePolicy(settingsSnap.data()?.integrations?.whatsapp?.journeyAutomation || {});
    const secondPurchaseDelaySeconds = Math.max(1, Math.min(604800,
      Math.ceil(((completedAtMs + secondPolicy.afterDays * 86400000) - Date.now()) / 1000)));
    let secondPurchaseQueued = false;
    try {
      await enqueueJourney(
        { type: 'second_purchase', storeId, sourceId: String(sourceId) },
        {
          delaySeconds: secondPurchaseDelaySeconds,
          retentionSeconds: 604800,
          idempotencyKey: `csi:second-purchase:${sourceId}`,
        },
      );
      secondPurchaseQueued = true;
    } catch (error) {
      // Uma falha na fila futura não invalida a recuperação pós-venda já agendada.
      console.error('[Second Purchase] Falha ao agendar', error?.message);
    }

    return res.status(200).json({
      success: true,
      queued: true,
      messageId: result.messageId,
      delaySeconds,
      secondPurchaseQueued,
    });
  }

  return res.status(400).json({ success: false, error: 'Tipo de jornada inválido.' });
}
